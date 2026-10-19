import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, Loader2 } from "lucide-react";
import { getActiveSessions } from "@/lib/sessionsApi";
import { logSessions } from "@/lib/sessionLogger";
import { logResourceSnapshot } from "@/lib/resourceLogger";
import { enforceConcurrentStreamLimits } from "@/lib/streamLimiter";
import { enforceTranscodeGuardian } from "@/lib/transcodeGuardian";
import GroupedSessions from "@/components/sessions/GroupedSessions";
import SessionsMap from "@/components/sessions/SessionsMap";
import { useToast } from "@/components/ui/use-toast";

export default function Sessions() {
  const [servers, setServers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const { toast } = useToast();

  const poll = useCallback(async (serverList) => {
    const results = await Promise.allSettled(
      serverList.map(async (server) => {
        const active = await getActiveSessions(server);
        logSessions(server, active).catch(() => {});
        logResourceSnapshot(server, active.length).catch(() => {});
        return active;
      })
    );
    const all = results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
    setSessions(all);
    setLoading(false);

    const serversById = Object.fromEntries(serverList.map((s) => [s.id, s]));
    enforceConcurrentStreamLimits(all, serversById)
      .then(({ killed }) => {
        if (killed > 0) {
          toast({ title: "Stream limit enforced", description: `Stopped ${killed} overflow stream(s) exceeding plan limits.` });
        }
      })
      .catch(() => {});
    enforceTranscodeGuardian(all, serversById)
      .then(({ killed }) => {
        if (killed > 0) {
          toast({ title: "4K transcode blocked", description: `Stopped ${killed} session(s) transcoding 4K content on a restricted plan.` });
        }
      })
      .catch(() => {});
  }, [toast]);

  useEffect(() => {
    base44.entities.MediaServer.list().then((data) => {
      const valid = data.filter((s) => s.url && s.api_key);
      setServers(valid);
      poll(valid);
      intervalRef.current = setInterval(() => { if (!document.hidden) poll(valid); }, 10000);
    });
    return () => clearInterval(intervalRef.current);
  }, [poll]);

  const serversById = Object.fromEntries(servers.map((s) => [s.id, s]));
  const refresh = () => poll(servers);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
          <Activity className="w-6 h-6 text-lime-400" /> Live Sessions
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Currently active streams across all connected servers</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading sessions…
        </div>
      ) : (
        <>
          {sessions.length > 0 && <SessionsMap sessions={sessions} />}
          <GroupedSessions
            sessions={sessions}
            serversById={serversById}
            onKilled={refresh}
            emptyMessage="No active streams. Sessions will appear here in real-time once someone starts watching."
          />
        </>
      )}
    </div>
  );
}