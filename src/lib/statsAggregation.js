import moment from "moment";

// Infer media type from title patterns (TV shows have S01E01, music has audio extensions)
export function inferMediaType(session) {
  const title = (session.title || "").toLowerCase();
  if (/s\d{1,2}e\d{1,2}/.test(title) || /season\s*\d/.test(title)) return "tv";
  if (/\.(mp3|flac|wav|aac|ogg|m4a)$/.test(title) || /\b(album|track|music|concert)\b/i.test(title)) return "music";
  return "movie";
}

// Global platform vitals from all sessions
export function computeGlobalMetrics(sessions) {
  let totalWatchSeconds = 0;
  let totalBandwidthKb = 0;
  let bitrateSum = 0;
  let bitrateCount = 0;
  const activeStreams = new Set();
  const activeUsers = new Set();

  for (const s of sessions) {
    totalWatchSeconds += s.elapsed_seconds || 0;
    if (s.bitrate) {
      bitrateSum += s.bitrate;
      bitrateCount += 1;
    }
    const dur = s.elapsed_seconds || 0;
    if (s.bitrate && dur) totalBandwidthKb += (s.bitrate * dur) / 8;
    const isActive = s.state === "playing" || s.state === "paused" || s.state === "buffering" || (!s.ended_at && s.started_at);
    if (isActive) activeStreams.add(s.session_key || s.id);
    if (s.username) activeUsers.add(s.username);
  }

  return {
    totalWatchHours: totalWatchSeconds / 3600,
    activeStreams: activeStreams.size,
    activeUsers: activeUsers.size,
    avgBitrate: bitrateCount > 0 ? bitrateSum / bitrateCount : 0,
    totalBandwidthGb: totalBandwidthKb / (1024 * 1024),
  };
}

// Time-series of concurrent stream counts bucketed by hour
export function bucketByHour(sessions, hoursBack = 24) {
  const buckets = {};
  for (let i = hoursBack; i >= 0; i--) {
    const t = moment().subtract(i, "hours").startOf("hour");
    const key = t.format("YYYY-MM-DD HH:00");
    buckets[key] = { time: key, label: t.format("MMM dd HH:mm"), concurrent: 0, sortKey: t.valueOf() };
  }
  for (const s of sessions) {
    if (!s.started_at) continue;
    const t = moment(s.started_at).startOf("hour");
    const key = t.format("YYYY-MM-DD HH:00");
    if (buckets[key]) buckets[key].concurrent += 1;
  }
  return Object.values(buckets).sort((a, b) => a.sortKey - b.sortKey);
}

// Daily play volume trend
export function bucketByDay(sessions, daysBack = 30) {
  const buckets = {};
  for (let i = daysBack; i >= 0; i--) {
    const t = moment().subtract(i, "days").startOf("day");
    const key = t.format("YYYY-MM-DD");
    buckets[key] = { date: key, label: t.format("MMM dd"), plays: 0, sortKey: t.valueOf() };
  }
  for (const s of sessions) {
    if (!s.started_at) continue;
    const key = moment(s.started_at).startOf("day").format("YYYY-MM-DD");
    if (buckets[key]) buckets[key].plays += 1;
  }
  return Object.values(buckets).sort((a, b) => a.sortKey - b.sortKey);
}

// Day of week distribution
export function bucketByDayOfWeek(sessions) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const s of sessions) {
    if (!s.started_at) continue;
    counts[moment(s.started_at).day()] += 1;
  }
  return days.map((d, i) => ({ day: d, plays: counts[i] }));
}

// Hour of day distribution (peak usage hours)
export function bucketByHourOfDay(sessions) {
  const counts = new Array(24).fill(0);
  for (const s of sessions) {
    if (!s.started_at) continue;
    counts[moment(s.started_at).hour()] += 1;
  }
  return counts.map((c, h) => ({ hour: `${h}:00`, plays: c }));
}

// Platform distribution
export function computePlatformStats(sessions) {
  const counts = {};
  for (const s of sessions) {
    const p = s.platform || "unknown";
    counts[p] = (counts[p] || 0) + 1;
  }
  return Object.entries(counts).map(([platform, count]) => ({ platform, count }));
}

// Codec distribution
export function computeCodecStats(sessions) {
  const counts = {};
  for (const s of sessions) {
    const c = (s.video_codec || s.source_video_codec || "unknown").toLowerCase();
    counts[c] = (counts[c] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([codec, count]) => ({ codec, count }))
    .sort((a, b) => b.count - a.count);
}

// Per-user aggregated engagement metrics
export function computeUserStats(sessions) {
  const users = {};
  for (const s of sessions) {
    if (!s.username) continue;
    if (!users[s.username]) {
      users[s.username] = {
        username: s.username,
        playCount: 0,
        watchSeconds: 0,
        bandwidthKb: 0,
        transcodes: 0,
        directPlays: 0,
        clients: {},
        libraries: {},
        servers: {},
        codecs: {},
        mediaTypes: {},
        hours: new Array(24).fill(0),
        lastSeen: null,
        serverIds: new Set(),
      };
    }
    const u = users[s.username];
    u.playCount += 1;
    u.watchSeconds += s.elapsed_seconds || 0;
    const dur = s.elapsed_seconds || 0;
    if (s.bitrate && dur) u.bandwidthKb += (s.bitrate * dur) / 8;
    if (s.transcode_decision === "transcode") u.transcodes += 1;
    if (s.transcode_decision === "direct play") u.directPlays += 1;
    const client = s.client_app || s.player || s.device || "Unknown";
    u.clients[client] = (u.clients[client] || 0) + 1;
    const lib = s.server_name || "Unknown";
    u.libraries[lib] = (u.libraries[lib] || 0) + 1;
    if (s.server_id) u.serverIds.add(s.server_id);
    const codec = (s.video_codec || s.source_video_codec || "unknown").toLowerCase();
    u.codecs[codec] = (u.codecs[codec] || 0) + 1;
    const mt = inferMediaType(s);
    u.mediaTypes[mt] = (u.mediaTypes[mt] || 0) + 1;
    if (s.started_at) {
      const m = moment(s.started_at);
      u.hours[m.hour()] += 1;
      if (!u.lastSeen || m.isAfter(u.lastSeen)) u.lastSeen = m.toDate();
    }
  }

  return Object.values(users)
    .map((u) => {
      const topClient = Object.entries(u.clients).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
      const topLibrary = Object.entries(u.libraries).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
      const topCodec = Object.entries(u.codecs).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
      const topMediaType = Object.entries(u.mediaTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || "movie";
      const peakHour = u.hours.indexOf(Math.max(...u.hours));
      return {
        username: u.username,
        playCount: u.playCount,
        watchHours: u.watchSeconds / 3600,
        bandwidthGb: u.bandwidthKb / (1024 * 1024),
        transcodes: u.transcodes,
        directPlays: u.directPlays,
        transcodeRate: u.playCount > 0 ? (u.transcodes / u.playCount) * 100 : 0,
        topClient,
        topLibrary,
        topCodec,
        topMediaType,
        peakHour,
        peakHourLabel: peakHour >= 0 ? `${peakHour}:00` : "—",
        lastSeen: u.lastSeen,
        serverCount: u.serverIds.size,
      };
    })
    .sort((a, b) => b.watchHours - a.watchHours);
}