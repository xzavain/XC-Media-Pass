import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { runBookStackMigration } from "@/lib/bookstackMigration";
import { canManageKb } from "@/lib/kbPermissions";
import MigrationConfigForm from "@/components/kb/migration/MigrationConfigForm";
import MigrationProgressPanel from "@/components/kb/migration/MigrationProgressPanel";
import MigrationLogTable from "@/components/kb/migration/MigrationLogTable";
import { AlertTriangle, History } from "lucide-react";

export default function BookStackMigration() {
  const { user } = useAuth();
  const [connection, setConnection] = useState(null);
  const [progress, setProgress] = useState(null);
  const [stats, setStats] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const pollRef = useRef(null);

  // Poll the migration log for live stats while a migration is running
  useEffect(() => {
    if (!isRunning) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const logs = await base44.entities.KbMigrationLog.list("-created_date", 1);
        if (logs[0]) setStats(logs[0]);
      } catch (e) { /* ignore poll errors */ }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isRunning]);

  if (!canManageKb(user)) {
    return <div className="p-8 text-sm text-zinc-500">Only staff and admins can run migrations.</div>;
  }

  const handleRun = async (config) => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setProgress({ step: "Initializing...", current: 0, total: 0, detail: "" });
    setStats(null);
    try {
      const res = await runBookStackMigration({
        baseUrl: config.baseUrl,
        tokenId: config.tokenId,
        tokenSecret: config.tokenSecret,
        corsProxy: config.corsProxy,
        user,
        onProgress: (p) => setProgress(p),
      });
      setResult(res);
      // Fetch final stats from the log
      const logs = await base44.entities.KbMigrationLog.list("-created_date", 1);
      if (logs[0]) setStats(logs[0]);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
      setRefreshKey((k) => k + 1);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">BookStack Migration Pipeline</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Import your entire BookStack knowledge base — shelves, books, chapters, pages, and all embedded media — into this platform.
        </p>
      </div>

      {/* Safety notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-200 font-medium">Non-Destructive, One-Way Import</p>
          <p className="text-xs text-amber-300/70 mt-1">
            This pipeline only reads from your BookStack instance via its REST API. It never writes to, modifies, or deletes any data in your external BookStack setup. All imported content is stored in this platform's dedicated database.
          </p>
        </div>
      </div>

      {/* Connection + Start */}
      <MigrationConfigForm
        onConnected={setConnection}
        onRunMigration={handleRun}
        isRunning={isRunning}
      />

      {/* Progress */}
      {(isRunning || progress || result) && (
        <MigrationProgressPanel progress={progress} stats={stats} />
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-lime-500/20 bg-lime-500/5 p-4">
          <p className="text-sm text-lime-200 font-medium">
            Migration {result.status === "completed" ? "completed successfully" : result.status === "partial" ? "completed with some errors" : "failed"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 text-xs">
            <div><span className="text-zinc-500">Shelves:</span> {result.stats.shelves.imported} new · {result.stats.shelves.updated} updated</div>
            <div><span className="text-zinc-500">Books:</span> {result.stats.books.imported} new · {result.stats.books.updated} updated</div>
            <div><span className="text-zinc-500">Chapters:</span> {result.stats.chapters.imported} new · {result.stats.chapters.updated} updated</div>
            <div><span className="text-zinc-500">Pages:</span> {result.stats.pages.imported} new · {result.stats.pages.updated} updated · {result.stats.pages.skipped} unchanged</div>
            <div><span className="text-zinc-500">Assets:</span> {result.stats.assets.imported - result.stats.assets.skipped} new · {result.stats.assets.skipped} reused</div>
          </div>
          {result.errors.length > 0 && (
            <p className="text-xs text-amber-400 mt-2">{result.errors.length} error(s) — see migration log below</p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-300 font-medium">Migration failed</p>
          <p className="text-xs text-red-400/70 mt-1">{error}</p>
        </div>
      )}

      {/* Migration History */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-200">Migration History</h3>
        </div>
        <MigrationLogTable refreshKey={refreshKey} />
      </div>
    </div>
  );
}