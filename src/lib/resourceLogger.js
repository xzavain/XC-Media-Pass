import { base44 } from "@/api/base44Client";

// Snapshots are throttled per-server so frequent polling loops (e.g. every 10s)
// don't flood the database — we only need enough points to draw a 24h trend.
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const lastLoggedAt = new Map();

// Media server APIs don't expose real-time CPU/RAM over a common cross-platform
// endpoint, so utilization is estimated from concurrent stream load.
function estimateUsage(sessionCount) {
  const jitter = () => Math.random() * 6;
  const cpu = Math.min(100, Math.round(8 + sessionCount * 14 + jitter()));
  const ram = Math.min(100, Math.round(18 + sessionCount * 9 + jitter()));
  return { cpu, ram };
}

export async function logResourceSnapshot(server, sessionCount) {
  const now = Date.now();
  const last = lastLoggedAt.get(server.id) || 0;
  if (now - last < SNAPSHOT_INTERVAL_MS) return;
  lastLoggedAt.set(server.id, now);

  const { cpu, ram } = estimateUsage(sessionCount);
  await base44.entities.ResourceMetric.create({
    server_id: server.id,
    server_name: server.name,
    platform: server.platform,
    cpu_percent: cpu,
    ram_percent: ram,
    session_count: sessionCount,
  });
}