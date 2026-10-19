import { killSession } from "@/lib/sessionsApi";
import { loadPlanResolver } from "@/lib/planResolver";

// Client-side concurrent-stream enforcement: groups active sessions by server+username,
// resolves each user's subscribed plan, and kills the newest overflow sessions when a
// plan's max_concurrent_streams is exceeded.
// NOTE: this only runs while an admin has the Sessions/Dashboard page open (no backend cron).
export async function enforceConcurrentStreamLimits(sessions, serversById) {
  if (!sessions.length) return { killed: 0 };

  const resolvePlan = await loadPlanResolver();

  const groups = {};
  for (const s of sessions) {
    const key = `${s.server_id}::${(s.username || "").toLowerCase()}`;
    (groups[key] = groups[key] || []).push(s);
  }

  let killed = 0;
  for (const group of Object.values(groups)) {
    if (group.length < 2) continue;

    const plan = resolvePlan(group[0].server_id, group[0].username);
    const max = plan?.max_concurrent_streams;
    if (!max || max <= 0 || group.length <= max) continue;

    // Keep the sessions that have been running longest, kill the rest (newest joiners).
    const overflow = group
      .slice()
      .sort((a, b) => (b.elapsed_seconds || 0) - (a.elapsed_seconds || 0))
      .slice(max);

    for (const session of overflow) {
      const server = serversById[session.server_id];
      if (!server) continue;
      try {
        await killSession(server, session, `Concurrent stream limit reached for your plan (max ${max}).`);
        killed++;
      } catch {
        // ignore individual kill failures
      }
    }
  }

  return { killed };
}