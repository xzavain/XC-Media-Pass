import React, { useState, useEffect } from "react";
import { useMediaAuth } from "@/lib/MediaAuthContext";
import { fetchAccountSessions } from "@/lib/deviceSessionApi";
import { Activity, Check } from "lucide-react";

export default function DiagnosticAttachBox({ onAttach }) {
  const { accounts, nodes } = useMediaAuth();
  const [attached, setAttached] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAttach = async () => {
    if (attached) {
      setAttached(false);
      setSnapshot(null);
      onAttach(null);
      return;
    }
    setLoading(true);
    try {
      const sessionResults = await Promise.allSettled(accounts.map((a) => fetchAccountSessions(a)));
      const activeSessions = sessionResults.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      const snap = {
        timestamp: new Date().toISOString(),
        linked_services: accounts.map((a) => a.service_type),
        server_nodes: nodes.map((n) => ({ name: n.node_name, type: n.service_type, region: n.assigned_region, status: n.node_health_status })),
        active_stream_count: activeSessions.length,
        active_streams: activeSessions.map((s) => ({
          device: s.device_name,
          title: s.media_title,
          state: s.playback_state,
          resolution: s.resolution_badge,
          quality: s.quality,
        })),
        client_info: navigator.userAgent.substring(0, 200),
      };
      setSnapshot(snap);
      setAttached(true);
      onAttach(snap);
    } catch {
      setSnapshot({ timestamp: new Date().toISOString(), error: "Failed to capture diagnostics" });
      setAttached(true);
      onAttach(snapshot);
    } finally {
      setLoading(false);
    }
  };

  if (accounts.length === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/40">
      <button
        type="button"
        onClick={handleAttach}
        disabled={loading}
        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
          attached
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
        }`}
      >
        {attached ? <Check className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
        {attached ? "Diagnostic data attached" : loading ? "Capturing..." : "Attach Diagnostic Data"}
      </button>
      <span className="text-xs text-slate-500">
        Includes ping to server, active streams, client info, and transcode state
      </span>
    </div>
  );
}