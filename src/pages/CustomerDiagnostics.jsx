import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMediaAuth } from "@/lib/MediaAuthContext";
import ServerHealthGrid from "@/components/diagnostics/ServerHealthGrid";
import NetworkDiagnosticTool from "@/components/diagnostics/NetworkDiagnosticTool";
import ActiveStreamInspector from "@/components/diagnostics/ActiveStreamInspector";
import { Activity, Wifi, MonitorPlay } from "lucide-react";
import { buildDiagnosticReport } from "@/lib/diagnosticsApi";
import { mapNodeToServerShape } from "@/lib/universalIdentityApi";
import { fetchAccountSessions, enrichWithGeo } from "@/lib/deviceSessionApi";

export default function CustomerDiagnostics() {
  const { nodes, accounts, isLoading: authLoading } = useMediaAuth();
  const [servers, setServers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const accountsRef = useRef([]);

  useEffect(() => { accountsRef.current = accounts; }, [accounts]);

  const loadLiveSessions = useCallback(async (accountList) => {
    if (accountList.length === 0) return [];
    const results = await Promise.allSettled(accountList.map((acc) => fetchAccountSessions(acc)));
    const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const activeOnly = all.filter((s) => s.playback_state !== "idle");
    const enriched = await enrichWithGeo(activeOnly);
    return enriched.map((s) => ({
      id: `${s.service_type}-${s.session_key}`,
      server_id: s.server_id,
      service_type: s.service_type,
      media_title: s.media_title,
      media_poster_url: s.poster_url,
      resolution: s.resolution_badge,
      stream_mode: "direct_play",
      current_bitrate_mbps: s.bitrate || null,
      buffer_health_seconds: null,
      video_codec: s.video_codec,
      transcode_reason: null,
      is_buffering: s.playback_state === "buffering",
    }));
  }, []);

  const loadAll = useCallback(async () => {
    const [alertList] = await Promise.all([
      base44.entities.ServerAlert.filter({ is_active: true }, "-created_date", 50),
    ]);
    setServers(nodes.filter((n) => n.is_public_for_diagnostics).map(mapNodeToServerShape));
    setAlerts(alertList);
    const liveSessions = await loadLiveSessions(accountsRef.current);
    setSessions(liveSessions);
    setLoading(false);
  }, [nodes, loadLiveSessions]);

  useEffect(() => { if (!authLoading) loadAll(); }, [authLoading, loadAll]);

  // Auto-refresh live sessions every 8 seconds across all connected admin nodes
  useEffect(() => {
    if (accounts.length === 0) return;
    const interval = setInterval(async () => {
      const liveSessions = await loadLiveSessions(accountsRef.current);
      setSessions(liveSessions);
    }, 8000);
    return () => clearInterval(interval);
  }, [accounts, loadLiveSessions]);

  const handleCopyReport = (session) => {
    const report = buildDiagnosticReport({
      server: servers.find((s) => s.id === session?.server_id),
      ping: null, jitter: null, mbps: null, ispInfo: null,
      sessions: session ? [session] : sessions,
    });
    navigator.clipboard.writeText(report);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">Live Node Health & Diagnostics</h1>
        <p className="text-sm text-zinc-500 mt-1">Monitor server health, test your connection, and optimize playback</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2"><Activity className="w-5 h-5 text-lime-400" /> Server & Node Health</h2>
        <ServerHealthGrid servers={servers} alerts={alerts} loading={loading} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2"><Wifi className="w-5 h-5 text-lime-400" /> Speed & Latency Diagnostic</h2>
        <NetworkDiagnosticTool servers={servers} activeSession={sessions[0]} sessions={sessions} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2"><MonitorPlay className="w-5 h-5 text-lime-400" /> Active Stream Inspector</h2>
        <ActiveStreamInspector sessions={sessions} servers={servers} loading={loading} onCopyReport={handleCopyReport} />
      </section>
    </div>
  );
}