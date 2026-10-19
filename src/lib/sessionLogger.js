import { base44 } from "@/api/base44Client";

// Throttled so the 10s polling loop doesn't flood the API — session history
// only needs enough points for a trend, not a write every poll.
const LOG_INTERVAL_MS = 60 * 1000; // 60 seconds
const lastLoggedAt = new Map();

// Upserts a snapshot of active sessions into PlaybackSession history,
// and closes out any previously-open sessions that are no longer active.
// Uses bulk operations to minimize API calls.
export async function logSessions(server, activeSessions) {
  const now = Date.now();
  const last = lastLoggedAt.get(server.id) || 0;
  if (now - last < LOG_INTERVAL_MS) return;
  lastLoggedAt.set(server.id, now);

  const open = await base44.entities.PlaybackSession.filter({ server_id: server.id, ended_at: null });
  const openByKey = new Map(open.map((o) => [o.session_key, o]));
  const activeKeys = new Set(activeSessions.map((s) => s.session_key));

  const toUpdate = [];
  const toCreate = [];
  for (const s of activeSessions) {
    const existing = openByKey.get(s.session_key);
    if (existing) {
      toUpdate.push({
        id: existing.id,
        state: s.state,
        progress_percent: s.progress_percent,
        transcode_decision: s.transcode_decision,
        device: s.device,
        player: s.player,
        client_app: s.client_app,
        client_version: s.client_version,
        resolution: s.resolution,
        ip_address: s.ip_address,
        bitrate: s.bitrate,
        elapsed_seconds: s.elapsed_seconds,
      });
    } else {
      toCreate.push({ ...s, started_at: new Date().toISOString() });
    }
  }

  const toClose = open
    .filter((o) => !activeKeys.has(o.session_key))
    .map((o) => ({ id: o.id, ended_at: new Date().toISOString() }));

  await Promise.all([
    toUpdate.length ? base44.entities.PlaybackSession.bulkUpdate(toUpdate) : Promise.resolve(),
    toCreate.length ? base44.entities.PlaybackSession.bulkCreate(toCreate) : Promise.resolve(),
    toClose.length ? base44.entities.PlaybackSession.bulkUpdate(toClose) : Promise.resolve(),
  ]);
}