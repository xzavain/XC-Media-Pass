import React, { useEffect, useState, useCallback } from "react";
import { Database, HardDrive, RefreshCw, Film, Tv, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/storage/StatCard";
import ServerCard from "@/components/storage/ServerCard";
import LibraryStorageCharts from "@/components/storage/LibraryStorageCharts";
import { formatBytes } from "@/lib/formatBytes";
import { loadSnapshots, refreshSnapshots, snapshotsToResults } from "@/lib/librarySnapshotCache";
import { getScheduleHours, setScheduleHours, isRefreshDue, setLastRefresh } from "@/lib/storageSchedule";

export default function StorageDashboard() {
  const [servers, setServers] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleHours, setScheduleHoursState] = useState(getScheduleHours);

  const loadAll = useCallback(async (force = false) => {
    setLoading(true);
    const list = await base44.entities.MediaServer.list();
    setServers(list);
    // 1. Render instantly from cached snapshots — no waiting on servers.
    let cached = {};
    try {
      const snaps = await loadSnapshots();
      cached = snapshotsToResults(snaps);
      setResults(cached);
    } catch { setResults({}); }
    setLoading(false);
    // 2. Only recalculate when forced, due by schedule, or there's no cache yet.
    const hasCache = Object.keys(cached).length > 0;
    if (!force && !isRefreshDue() && hasCache) return;
    setResults((prev) => {
      const next = { ...prev };
      for (const srv of list) if (!next[srv.id]) next[srv.id] = { loading: true };
      return next;
    });
    setRefreshing(true);
    try {
      const fresh = await refreshSnapshots(list);
      setResults((prev) => {
        const merged = { ...prev };
        for (const srv of list) {
          const f = fresh[srv.id];
          if (f?.libraries) merged[srv.id] = f;
          else if (!merged[srv.id]?.libraries) merged[srv.id] = f || { loading: false, error: "Unavailable" };
        }
        return merged;
      });
      setLastRefresh();
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll(false);
    // Re-check the schedule every minute while the dashboard is open.
    const id = setInterval(() => { if (isRefreshDue()) loadAll(false); }, 60 * 1000);
    return () => clearInterval(id);
  }, [loadAll]);

  const changeSchedule = (h) => {
    setScheduleHours(h);
    setScheduleHoursState(h);
  };

  const grandTotal = Object.values(results).reduce((s, r) => s + (r.totalSize || 0), 0);
  const totalItems = Object.values(results).reduce((s, r) => s + (r.itemCount || 0), 0);
  const libraryCount = Object.values(results).reduce((s, r) => s + (r.libraries?.length || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60 bg-zinc-900/30 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-violet-400" />
          <div>
            <h1 className="text-sm font-semibold text-white">Storage Dashboard</h1>
            <p className="text-xs text-zinc-500">Total media size across all libraries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={scheduleHours}
              onChange={(e) => changeSchedule(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
              title="Automatic refresh schedule"
            >
              <option value={0}>Manual</option>
              <option value={6}>Every 6h</option>
              <option value={12}>Every 12h</option>
              <option value={24}>Every 24h</option>
            </select>
          </div>
          <button
            onClick={() => loadAll(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          {refreshing && <span className="text-xs text-zinc-500">Updating…</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Storage" value={formatBytes(grandTotal)} icon={HardDrive} />
          <StatCard label="Media Items" value={totalItems.toLocaleString()} icon={Film} />
          <StatCard label="Libraries" value={libraryCount} icon={Database} />
          <StatCard label="Servers" value={servers.length} icon={Tv} />
        </div>

        <LibraryStorageCharts servers={servers} results={results} />

        {servers.length === 0 && !loading && (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-10 text-center text-zinc-500 text-sm">
            No media servers connected. Add a server to view storage usage.
          </div>
        )}

        {servers.map((srv) => (
          <ServerCard key={srv.id} server={srv} result={results[srv.id] || { loading: true }} />
        ))}
      </div>
    </div>
  );
}