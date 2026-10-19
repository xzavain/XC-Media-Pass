import { base44 } from "@/api/base44Client";
import { getActiveSessions } from "@/lib/sessionsApi";
import { getLocation } from "@/lib/geoApi";

// ============================================================
// Performance & Analytics Sync Engine
// Aggregates live session telemetry from every connected media
// server into persisted time-series snapshots, device telemetry
// records, and bandwidth breakdowns. Designed to run on a 6-hour
// throttle (automatic) or immediately (manual refresh, force=true).
//
// NOTE: A true server-side cron (every 6h, even with no admin
// viewing the app) requires a scheduled backend function, which
// needs a Builder+ plan. Until then, this engine runs from the
// dashboard polling loop + manual refresh and writes at most once
// every 6 hours per server.
// ============================================================

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
// Cooldown between automatic (non-forced) checks so the 10s dashboard poll loop
// doesn't spam the database with latest-snapshot queries. Forced refreshes
// bypass this entirely.
const AUTO_CHECK_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
let lastAutoCheck = 0;

// ---- Classification helpers ----
export function classifyCodec(codec) {
  const c = (codec || "").toUpperCase();
  if (c.includes("H264") || c.includes("H.264") || c.includes("AVC")) return "H264";
  if (c.includes("HEVC") || c.includes("H265") || c.includes("H.265")) return "HEVC";
  if (c.includes("AV1")) return "AV1";
  if (c.includes("VP9")) return "VP9";
  return "other";
}

export function classifyResolution(res) {
  const r = (res || "").toLowerCase();
  if (r.includes("4k") || r.includes("2160")) return "4K";
  if (r.includes("1080")) return "1080p";
  if (r.includes("720")) return "720p";
  if (r.includes("480") || r === "sd") return "SD";
  return "other";
}

export function classifyDevice(device, player, clientApp) {
  const s = `${device || ""} ${player || ""} ${clientApp || ""}`.toLowerCase();
  if (s.includes("apple tv") || s.includes("appletv") || s.includes("tvos")) return "apple_tv";
  if (s.includes("roku")) return "roku";
  if (s.includes("steam deck") || s.includes("steamdeck")) return "steam_deck";
  if (s.includes("android tv") || s.includes("androidtv") || s.includes("shield") || s.includes("fire tv") || s.includes("firetv") || s.includes("tizen") || s.includes("webos")) return "android_tv";
  if (s.includes("iphone") || s.includes("ios") || s.includes("ipad") || s.includes("android")) return "ios";
  if (s.includes("windows") || s.includes("web") || s.includes("browser") || s.includes("chrome") || s.includes("firefox") || s.includes("safari") || s.includes("edge") || s.includes("electron")) return "web";
  return "other";
}

export function compatibilityScore(transcodeDecision, resolution) {
  if (transcodeDecision === "direct play") return 100;
  const base = { "4K": 60, "1080p": 75, "720p": 80, SD: 85, other: 70 };
  return base[classifyResolution(resolution)] ?? 70;
}

export function streamingProfile(transcodeDecision, resolution, codec) {
  if (transcodeDecision === "direct play") return `Direct Play (${resolution || codec || "Original"})`;
  return `Transcode (${resolution || "Auto"})`;
}

function emptyBreakdown(keys) {
  return keys.reduce((acc, k) => { acc[k] = 0; return acc; }, {});
}

function isPrivateIp(ip) {
  if (!ip) return true;
  const clean = ip.split(":")[0];
  if (/^(10\.|192\.168\.|169\.254\.|127\.|0\.0\.0\.0)/.test(clean)) return true;
  const m = clean.match(/^172\.(\d+)\./);
  if (m && +m[1] >= 16 && +m[1] <= 31) return true;
  if (clean === "::1" || clean === "") return true;
  return false;
}

// Fetch the most recent snapshot for a server to enforce the 6h throttle.
async function latestSnapshot(serverId) {
  const rows = await base44.entities.PerformanceSnapshot.filter(
    { server_id: serverId },
    "-captured_at",
    1
  );
  return rows[0] || null;
}

// ---- Main sync entry point ----
export async function syncPerformance({ force = false } = {}) {
  if (!force && Date.now() - lastAutoCheck < AUTO_CHECK_COOLDOWN_MS) {
    return { servers: 0, snapshots: 0, devices: 0, bandwidth: 0, skipped: 0, throttled: true };
  }
  lastAutoCheck = Date.now();

  const servers = (await base44.entities.MediaServer.list()).filter(
    (s) => s.url && s.api_key
  );
  const now = new Date();
  const summary = { servers: servers.length, snapshots: 0, devices: 0, bandwidth: 0, skipped: 0 };

  for (const server of servers) {
    let sessions = [];
    try {
      sessions = await getActiveSessions(server);
    } catch (err) {
      console.warn(`[performanceSync] ${server.name}: session fetch failed`, err);
    }

    // Throttle: skip this server if last snapshot is < 6h old (unless forced)
    if (!force) {
      const last = await latestSnapshot(server.id);
      if (last && last.captured_at && now - new Date(last.captured_at) < SYNC_INTERVAL_MS) {
        summary.skipped += 1;
        continue;
      }
    }

    const capturedAt = now.toISOString();
    const codecBd = emptyBreakdown(["H264", "HEVC", "AV1", "VP9", "other"]);
    const resBd = emptyBreakdown(["4K", "1080p", "720p", "SD", "other"]);
    const devDist = emptyBreakdown(["apple_tv", "roku", "web", "android_tv", "steam_deck", "ios", "other"]);
    let peakBitrate = 0;
    let totalBwKb = 0;
    let localBwKb = 0;
    let remoteBwKb = 0;
    let transcodeCount = 0;
    let directCount = 0;
    const users = new Set();

    // Per-device + per-bandwidth accumulators
    const deviceMap = new Map();
    const userBw = new Map();
    const mediaBw = new Map();

    for (const s of sessions) {
      const codec = classifyCodec(s.video_codec || s.source_video_codec);
      const res = classifyResolution(s.resolution || s.source_resolution);
      const dev = classifyDevice(s.device, s.player, s.client_app);
      codecBd[codec] = (codecBd[codec] || 0) + 1;
      resBd[res] = (resBd[res] || 0) + 1;
      devDist[dev] = (devDist[dev] || 0) + 1;
      peakBitrate = Math.max(peakBitrate, s.bitrate || 0);
      const elapsed = s.elapsed_seconds || 0;
      const bwKb = ((s.bitrate || 0) * elapsed) / 8;
      totalBwKb += bwKb;
      if (isPrivateIp(s.ip_address)) localBwKb += bwKb; else remoteBwKb += bwKb;
      if (s.transcode_decision === "transcode") transcodeCount++;
      else directCount++;
      if (s.username) users.add(s.username);

      // Device telemetry key
      const dKey = `${s.device || "?"}|${s.client_app || ""}|${s.username || ""}`;
      if (!deviceMap.has(dKey)) {
        deviceMap.set(dKey, {
          server_id: server.id,
          server_name: server.name,
          platform: server.platform,
          username: s.username || "",
          device: s.device || "Unknown",
          player: s.player || "",
          client_app: s.client_app || "",
          client_version: s.client_version || "",
          ip_address: s.ip_address || "",
          transcode_decision: s.transcode_decision,
          resolution: s.resolution || "",
          codec: s.video_codec || s.source_video_codec || "",
          bitrate: s.bitrate || 0,
          compatibility_score: compatibilityScore(s.transcode_decision, s.resolution),
          streaming_profile: streamingProfile(s.transcode_decision, s.resolution, s.video_codec),
          last_seen: capturedAt,
          is_active: true,
        });
      }

      // Bandwidth accumulators (track total KB + peak stream bitrate per label)
      const uKey = s.username || "Unknown";
      const uPrev = userBw.get(uKey) || { bwKb: 0, peakBitrate: 0 };
      uPrev.bwKb += bwKb;
      uPrev.peakBitrate = Math.max(uPrev.peakBitrate, s.bitrate || 0);
      userBw.set(uKey, uPrev);
      const mKey = s.title || "Unknown";
      const mPrev = mediaBw.get(mKey) || { bwKb: 0, peakBitrate: 0 };
      mPrev.bwKb += bwKb;
      mPrev.peakBitrate = Math.max(mPrev.peakBitrate, s.bitrate || 0);
      mediaBw.set(mKey, mPrev);
    }

    // Latest resource metric for CPU/RAM
    let cpu = null, ram = null;
    try {
      const rm = await base44.entities.ResourceMetric.filter({ server_id: server.id }, "-created_date", 1);
      if (rm[0]) { cpu = rm[0].cpu_percent; ram = rm[0].ram_percent; }
    } catch {}

    await base44.entities.PerformanceSnapshot.create({
      server_id: server.id,
      server_name: server.name,
      platform: server.platform,
      captured_at: capturedAt,
      concurrent_streams: sessions.length,
      peak_bitrate: peakBitrate,
      total_bandwidth_kb: Math.round(totalBwKb),
      local_bandwidth_kb: Math.round(localBwKb),
      remote_bandwidth_kb: Math.round(remoteBwKb),
      transcode_count: transcodeCount,
      direct_play_count: directCount,
      active_users: users.size,
      codec_breakdown: codecBd,
      resolution_breakdown: resBd,
      device_distribution: devDist,
      cpu_percent: cpu,
      ram_percent: ram,
      network_io_kbps: Math.round(peakBitrate),
    });
    summary.snapshots += 1;

    // ---- Upsert device telemetry ----
    await upsertDeviceTelemetry(server, deviceMap, capturedAt);
    summary.devices += deviceMap.size;

    // ---- Upsert bandwidth breakdowns ----
    await upsertBandwidth(server, "user", userBw, capturedAt);
    await upsertBandwidth(server, "media", mediaBw, capturedAt);
    summary.bandwidth += userBw.size + mediaBw.size;
  }

  return summary;
}

// Upsert device telemetry: mark existing devices inactive, then refresh/create
// the ones seen in this sync. Geo is enriched for public IPs (cached).
async function upsertDeviceTelemetry(server, deviceMap, capturedAt) {
  const existing = await base44.entities.DeviceTelemetry.filter({ server_id: server.id });
  const byKey = new Map(existing.map((d) => [`${d.device}|${d.client_app || ""}|${d.username || ""}`, d]));

  // Enrich geo for unique public IPs
  const ipToGeo = new Map();
  for (const d of deviceMap.values()) {
    if (d.ip_address && !ipToGeo.has(d.ip_address.split(":")[0])) {
      ipToGeo.set(d.ip_address.split(":")[0], null);
    }
  }
  await Promise.all(
    Array.from(ipToGeo.keys()).map(async (ip) => {
      const geo = await getLocation(ip);
      ipToGeo.set(ip, geo);
    })
  );

  const toUpdate = [];
  const toCreate = [];
  for (const [key, d] of deviceMap) {
    d.geo = d.ip_address ? ipToGeo.get(d.ip_address.split(":")[0]) : null;
    const prev = byKey.get(key);
    if (prev) {
      toUpdate.push({
        id: prev.id,
        player: d.player,
        client_version: d.client_version,
        ip_address: d.ip_address,
        geo: d.geo,
        transcode_decision: d.transcode_decision,
        resolution: d.resolution,
        codec: d.codec,
        bitrate: d.bitrate,
        compatibility_score: d.compatibility_score,
        streaming_profile: d.streaming_profile,
        last_seen: capturedAt,
        is_active: true,
      });
    } else {
      toCreate.push(d);
    }
  }
  // Mark devices not seen this cycle as inactive
  const toDeactivate = existing
    .filter((d) => !deviceMap.has(`${d.device}|${d.client_app || ""}|${d.username || ""}`))
    .map((d) => ({ id: d.id, is_active: false }));

  await Promise.all([
    toUpdate.length ? base44.entities.DeviceTelemetry.bulkUpdate(toUpdate) : Promise.resolve(),
    toCreate.length ? base44.entities.DeviceTelemetry.bulkCreate(toCreate) : Promise.resolve(),
    toDeactivate.length ? base44.entities.DeviceTelemetry.bulkUpdate(toDeactivate) : Promise.resolve(),
  ]);
}

// Upsert bandwidth breakdown: accumulate totals across sync cycles.
async function upsertBandwidth(server, dimension, bwMap, capturedAt) {
  const existing = await base44.entities.BandwidthBreakdown.filter({
    server_id: server.id,
    dimension,
  });
  const byLabel = new Map(existing.map((b) => [b.label, b]));
  const toUpdate = [];
  const toCreate = [];
  for (const [label, info] of bwMap) {
    const prev = byLabel.get(label);
    if (prev) {
      toUpdate.push({
        id: prev.id,
        total_bandwidth_kb: Math.round((prev.total_bandwidth_kb || 0) + info.bwKb),
        stream_count: (prev.stream_count || 0) + 1,
        peak_bitrate: Math.max(prev.peak_bitrate || 0, info.peakBitrate),
        last_updated: capturedAt,
      });
    } else {
      toCreate.push({
        server_id: server.id,
        server_name: server.name,
        platform: server.platform,
        dimension,
        label,
        total_bandwidth_kb: Math.round(info.bwKb),
        stream_count: 1,
        peak_bitrate: info.peakBitrate,
        last_updated: capturedAt,
      });
    }
  }
  await Promise.all([
    toUpdate.length ? base44.entities.BandwidthBreakdown.bulkUpdate(toUpdate) : Promise.resolve(),
    toCreate.length ? base44.entities.BandwidthBreakdown.bulkCreate(toCreate) : Promise.resolve(),
  ]);
}