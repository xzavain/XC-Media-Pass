import { base44 } from "@/api/base44Client";
import { getLocation } from "@/lib/geoApi";

// Aggregates everything a user profile needs from PlaybackSession history,
// UserViolation, and UserTermination records, plus enriched IP geolocation.
//
// Sessions are matched by server_id + username (the platform login name stored
// on both ServerUser and PlaybackSession), which is stable across re-adds.
export async function loadUserProfile(serverUser) {
  const [sessions, violations, terminations] = await Promise.all([
    base44.entities.PlaybackSession.filter({
      server_id: serverUser.server_id,
      username: serverUser.username,
    }),
    base44.entities.UserViolation.filter({ server_user_id: serverUser.id }),
    base44.entities.UserTermination.filter({ server_user_id: serverUser.id }),
  ]);

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0)
  );

  // ---- Statistics ----
  const totalPlays = sessions.length;
  const watchSeconds = sessions.reduce((s, x) => s + (x.elapsed_seconds || 0), 0);
  // Estimate bandwidth as bitrate (kbps) * duration (s) / 8 -> KB
  const bandwidthKB = sessions.reduce(
    (s, x) => s + ((x.bitrate || 0) * (x.duration_seconds || x.elapsed_seconds || 0)) / 8,
    0
  );
  const transcodeCount = sessions.filter((s) => s.transcode_decision === "transcode").length;
  const directCount = sessions.filter((s) => s.transcode_decision === "direct play").length;
  const resolutionCounts = sessions.reduce((acc, s) => {
    const r = s.resolution || s.source_resolution || "Unknown";
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  // ---- Locations ----
  const ipMap = new Map();
  for (const s of sessions) {
    if (!s.ip_address) continue;
    const key = s.ip_address.split(":")[0];
    if (!ipMap.has(key)) {
      ipMap.set(key, {
        ip: key,
        first_seen: s.started_at,
        last_seen: s.started_at,
        play_count: 0,
        titles: new Set(),
      });
    }
    const entry = ipMap.get(key);
    entry.play_count += 1;
    if (s.started_at && new Date(s.started_at) < new Date(entry.first_seen)) entry.first_seen = s.started_at;
    if (s.started_at && new Date(s.started_at) > new Date(entry.last_seen)) entry.last_seen = s.started_at;
    if (s.title) entry.titles.add(s.title);
  }
  const ipEntries = Array.from(ipMap.values());
  const geoResults = await Promise.all(ipEntries.map((e) => getLocation(e.ip)));
  const locations = ipEntries
    .map((e, i) => ({ ...e, geo: geoResults[i], titles: Array.from(e.titles).slice(0, 5) }))
    .filter((e) => e.geo);

  // ---- Device Intelligence ----
  const deviceMap = new Map();
  for (const s of sessions) {
    const key = [s.device, s.player, s.client_app].filter(Boolean).join(" | ") || "Unknown";
    if (!deviceMap.has(key)) {
      deviceMap.set(key, {
        device: s.device || "Unknown",
        player: s.player || "Unknown",
        client_app: s.client_app || "",
        client_version: s.client_version || "",
        resolution: s.resolution || "",
        last_ip: s.ip_address || "",
        last_seen: s.started_at,
        play_count: 0,
      });
    }
    const d = deviceMap.get(key);
    d.play_count += 1;
    if (s.started_at && new Date(s.started_at) > new Date(d.last_seen)) {
      d.last_seen = s.started_at;
      d.last_ip = s.ip_address || d.last_ip;
      d.resolution = s.resolution || d.resolution;
      d.client_version = s.client_version || d.client_version;
    }
  }
  const devices = Array.from(deviceMap.values()).sort((a, b) => b.play_count - a.play_count);

  // ---- Recent Activity ----
  const recent = sorted.slice(0, 25).map((s) => ({
    id: s.id,
    title: s.title || "Unknown",
    server_name: s.server_name,
    state: s.state,
    transcode_decision: s.transcode_decision,
    resolution: s.resolution,
    progress_percent: s.progress_percent,
    started_at: s.started_at,
    ended_at: s.ended_at,
    ip_address: s.ip_address,
    device: s.device,
  }));

  // ---- Trust Score ----
  // Recompute from violations so it always reflects current data: start at 100,
  // subtract weighted penalties (high=25, medium=10, low=3), floor at 0.
  const penalty = { high: 25, medium: 10, low: 3 };
  const computedTrust = Math.max(
    0,
    100 - violations.reduce((s, v) => s + (penalty[v.severity] || 0), 0)
  );

  return {
    stats: {
      totalPlays,
      watchSeconds,
      bandwidthKB,
      transcodeCount,
      directCount,
      resolutionCounts,
    },
    locations,
    devices,
    recent,
    violations: [...violations].sort(
      (a, b) => new Date(b.detected_at || 0) - new Date(a.detected_at || 0)
    ),
    terminations: [...terminations].sort(
      (a, b) => new Date(b.performed_at || 0) - new Date(a.performed_at || 0)
    ),
    computedTrust,
  };
}

// Persist the computed trust score back to the ServerUser record so the list
// view and other surfaces can show it without re-aggregating.
export async function syncTrustScore(serverUser, computedTrust) {
  if (serverUser.trust_score === computedTrust) return;
  await base44.entities.ServerUser.update(serverUser.id, { trust_score: computedTrust });
}