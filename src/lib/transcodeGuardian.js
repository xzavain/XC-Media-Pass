import { killSession } from "@/lib/sessionsApi";
import { loadPlanResolver } from "@/lib/planResolver";

function resolutionHeight(resStr) {
  if (!resStr) return 0;
  const m = /(\d+)x(\d+)/.exec(resStr);
  if (m) return parseInt(m[2], 10);
  if (/4k/i.test(resStr)) return 2160;
  return 0;
}

function isFourK(session) {
  return Math.max(resolutionHeight(session.resolution), resolutionHeight(session.source_resolution)) >= 2000;
}

// Client-side transcode guardian: kills any active 4K transcoding session for users
// whose plan has block_4k_transcode enabled.
// NOTE: this only runs while an admin has the Sessions/Dashboard page open (no backend cron).
export async function enforceTranscodeGuardian(sessions, serversById) {
  if (!sessions.length) return { killed: 0 };

  const resolvePlan = await loadPlanResolver();
  let killed = 0;

  for (const session of sessions) {
    if (session.transcode_decision !== "transcode") continue;
    if (!isFourK(session)) continue;

    const plan = resolvePlan(session.server_id, session.username);
    if (!plan?.block_4k_transcode) continue;

    const server = serversById[session.server_id];
    if (!server) continue;

    try {
      await killSession(server, session, "4K Transcoding not allowed on your plan.");
      killed++;
    } catch {
      // ignore individual kill failures
    }
  }

  return { killed };
}