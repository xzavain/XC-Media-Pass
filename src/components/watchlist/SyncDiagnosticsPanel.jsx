import React, { useState, useCallback, useEffect } from "react";
import { useMediaAuth } from "@/lib/MediaAuthContext";
import { useAuth } from "@/lib/AuthContext";
import { runInboundSync, testServiceConnection, WRITEBACK_ENABLED } from "@/lib/watchlistSyncApi";
import { base44 } from "@/api/base44Client";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Wifi, WifiOff, Terminal, ChevronDown, ChevronUp } from "lucide-react";

const SERVICE_META = {
  plex: { label: "Plex", color: "#e5a00d", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  emby: { label: "Emby", color: "#52B54B", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  jellyfin: { label: "Jellyfin", color: "#aa5cc3", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
};

const STATUS_META = {
  active: { icon: CheckCircle2, label: "Active", text: "text-lime-400", bg: "bg-lime-500/10", border: "border-lime-500/30" },
  invalid_token: { icon: XCircle, label: "Invalid Token", text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  unreachable: { icon: WifiOff, label: "Host Unreachable", text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  no_server: { icon: AlertTriangle, label: "No Server Node", text: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
  not_connected: { icon: WifiOff, label: "Not Linked", text: "text-zinc-500", bg: "bg-zinc-800/50", border: "border-zinc-700" },
  error: { icon: AlertTriangle, label: "Error", text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  unknown: { icon: AlertTriangle, label: "Unknown", text: "text-zinc-400", bg: "bg-zinc-800/50", border: "border-zinc-700" },
};

function ConnectionBadge({ service, status, message }) {
  const meta = SERVICE_META[service];
  const st = STATUS_META[status] || STATUS_META.unknown;
  const Icon = st.icon;
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${st.border} ${st.bg}`}>
      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: `${meta.color}20` }}>
        <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-white">{meta.label}</span>
          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${st.text}`}>
            <Icon className="w-3 h-3" /> {st.label}
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 truncate">{message || "—"}</p>
      </div>
    </div>
  );
}

export default function SyncDiagnosticsPanel({ onSyncComplete }) {
  const { identity, nodes, refreshAuth } = useMediaAuth();
  const { user, checkUserAuth } = useAuth();
  const [connStatus, setConnStatus] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const [testingConns, setTestingConns] = useState(false);

  // Load last sync from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("watchlist_last_sync");
    if (stored) {
      try { setLastSync(JSON.parse(stored)); } catch {}
    }
  }, []);

  const testConnections = useCallback(async () => {
    if (!identity) return;
    setTestingConns(true);
    const services = ["plex", "emby", "jellyfin"];
    const results = {};
    await Promise.all(services.map(async (svc) => {
      results[svc] = await testServiceConnection(svc, identity, nodes);
    }));
    setConnStatus(results);
    const errors = services
      .filter((s) => results[s].error || (results[s].status === "error"))
      .map((s) => ({ service: s, ...results[s], time: new Date().toISOString() }));
    if (errors.length > 0) setErrorLogs((prev) => [...errors, ...prev].slice(0, 50));
    setTestingConns(false);
  }, [identity, nodes]);

  useEffect(() => {
    if (identity) testConnections();
  }, [identity, testConnections]);

  const handleSync = async () => {
    if (!identity || !user) return;
    setSyncing(true);
    setErrorLogs([]);
    try {
      const currentWatchlist = user?.watchlist || [];
      const result = await runInboundSync(identity, nodes, currentWatchlist);

      // Persist merged watchlist
      if (result.totalImported > 0) {
        await base44.auth.updateMe({ watchlist: result.mergedWatchlist });
        await checkUserAuth();
      }

      setSyncResult(result);
      const syncMeta = {
        timestamp: result.timestamp,
        plex: { found: result.plex.itemsFound, imported: result.plex.itemsImported, status: result.plex.status },
        emby: { found: result.emby.itemsFound, imported: result.emby.itemsImported, status: result.emby.status },
        jellyfin: { found: result.jellyfin.itemsFound, imported: result.jellyfin.itemsImported, status: result.jellyfin.status },
        totalImported: result.totalImported,
      };
      setLastSync(syncMeta);
      localStorage.setItem("watchlist_last_sync", JSON.stringify(syncMeta));

      // Collect errors for debug console
      const errs = [];
      for (const svc of ["plex", "emby", "jellyfin"]) {
        if (result[svc].error) {
          errs.push({ service: svc, message: result[svc].error, time: result.timestamp });
        }
      }
      if (errs.length > 0) setErrorLogs((prev) => [...errs, ...prev].slice(0, 50));

      if (onSyncComplete) onSyncComplete(result);
    } catch (err) {
      setErrorLogs((prev) => [{ service: "system", message: err.message, time: new Date().toISOString() }, ...prev].slice(0, 50));
    } finally {
      setSyncing(false);
    }
  };

  const services = ["plex", "emby", "jellyfin"];
  const lastSyncDate = lastSync?.timestamp ? new Date(lastSync.timestamp).toLocaleString() : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-slate-950/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-lime-400" /> Sync Diagnostics
        </h3>
        <div className="flex items-center gap-2">
          {lastSyncDate && (
            <span className="text-[10px] text-zinc-500">Last sync: {lastSyncDate}</span>
          )}
          <button
            onClick={testConnections}
            disabled={testingConns || !identity}
            className="text-zinc-400 hover:text-white transition-colors"
            title="Re-test connections"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConns ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Connection status badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {services.map((svc) => (
          <ConnectionBadge
            key={svc}
            service={svc}
            status={connStatus[svc]?.status || (testingConns ? "unknown" : "not_connected")}
            message={connStatus[svc]?.message}
          />
        ))}
      </div>

      {/* Sync metrics */}
      {lastSync && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Total Imported</p>
            <p className="text-lg font-bold text-lime-400">{lastSync.totalImported || 0}</p>
          </div>
          {services.map((svc) => {
            const meta = SERVICE_META[svc];
            const data = lastSync[svc];
            return (
              <div key={svc} className="px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{meta.label}</p>
                <p className="text-sm font-semibold text-white">
                  {data?.found ?? 0} <span className="text-[10px] text-zinc-500">found</span>
                </p>
                <p className="text-[10px]" style={{ color: meta.color }}>
                  +{data?.imported ?? 0} imported
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual sync trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSync}
          disabled={syncing || !identity}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-500/10 border border-lime-500/30 text-lime-400 text-sm font-medium hover:bg-lime-500/20 transition-colors disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {syncing ? "Syncing…" : "Sync Inbound Now"}
        </button>
        {syncResult && !syncing && (
          <span className="text-xs text-zinc-400">
            {syncResult.totalImported > 0
              ? `✓ ${syncResult.totalImported} new item${syncResult.totalImported !== 1 ? "s" : ""} imported`
              : "✓ Already up to date — no new items found"}
          </span>
        )}
      </div>

      {/* Write-back status indicator */}
      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
        <div className={`w-2 h-2 rounded-full ${WRITEBACK_ENABLED ? "bg-lime-500" : "bg-zinc-600"}`} />
        Write-back (Website → Server): {WRITEBACK_ENABLED ? "Enabled" : "Disabled — inbound sync only"}
      </div>

      {/* Debug console */}
      {errorLogs.length > 0 && (
        <div>
          <button
            onClick={() => setShowConsole((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            Debug Console ({errorLogs.length})
            {showConsole ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showConsole && (
            <div className="mt-2 rounded-lg bg-black/60 border border-zinc-800 p-3 max-h-48 overflow-y-auto space-y-1.5 font-mono">
              {errorLogs.map((log, i) => (
                <div key={i} className="text-[11px] text-zinc-400 flex items-start gap-2">
                  <span className="text-zinc-600 shrink-0">{new Date(log.time).toLocaleTimeString()}</span>
                  <span className="text-orange-400 shrink-0 uppercase">{log.service}</span>
                  <span className="text-zinc-300">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}