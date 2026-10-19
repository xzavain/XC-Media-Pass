import React from "react";
import { Loader2, CheckCircle2, RefreshCw, Clock, AlertCircle } from "lucide-react";

/**
 * Compact banner showing the auto-sync status.
 * Appears when syncing, just completed, or errored — hides when idle/skipped.
 */
export default function AutoSyncBanner({ status, lastSync, onManualSync }) {
  if (status === "idle" || status === "skipped") {
    // Still show a subtle "next sync" hint if we have a lastSync timestamp
    if (!lastSync) return null;
    const next = new Date(new Date(lastSync.timestamp).getTime() + 24 * 60 * 60 * 1000);
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs text-white/50">
        <Clock className="w-3.5 h-3.5" />
        <span>Last auto-sync: {new Date(lastSync.timestamp).toLocaleString()}</span>
        <span className="text-white/30">·</span>
        <span>Next: {next.toLocaleString()}</span>
      </div>
    );
  }

  if (status === "syncing") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-lime-500/10 border border-lime-500/30 text-xs text-lime-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Auto-syncing favorites from your media servers…</span>
      </div>
    );
  }

  if (status === "complete") {
    const imported = lastSync?.totalImported || 0;
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>
          {imported > 0
            ? `Auto-sync complete — ${imported} new item${imported !== 1 ? "s" : ""} imported`
            : "Auto-sync complete — already up to date"}
        </span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Auto-sync failed — you can retry manually</span>
        <button onClick={onManualSync} className="ml-1 underline hover:text-red-300">
          Retry
        </button>
      </div>
    );
  }

  return null;
}