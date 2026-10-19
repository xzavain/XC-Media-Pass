import React from "react";
import { Loader2, AlertTriangle, HardDrive, Film, Music2, Tv } from "lucide-react";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { formatBytes } from "@/lib/formatBytes";

const libTypeIcon = (type) => {
  if (type === "movie") return Film;
  if (type === "show" || type === "tvshows") return Tv;
  if (type === "artist" || type === "music") return Music2;
  return HardDrive;
};

export default function ServerCard({ server, result }) {
  const { loading, libraries = [], totalSize = 0, itemCount = 0, error } = result;
  const max = libraries.length ? Math.max(...libraries.map((l) => l.totalSize || 0)) : 0;

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <HardDrive className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-white truncate">{server.name}</span>
          <PlatformBadge platform={server.platform} />
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-zinc-500">{itemCount.toLocaleString()} items</span>
          <span className="text-white font-semibold text-sm tabular-nums">{formatBytes(totalSize)}</span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 px-4 py-6 text-zinc-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" /> Calculating library sizes…
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 px-4 py-4 text-amber-400 text-xs">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {!loading && !error && libraries.length === 0 && (
        <div className="px-4 py-4 text-zinc-500 text-xs">No libraries found on this server.</div>
      )}

      {!loading && !error && libraries.length > 0 && (
        <div className="divide-y divide-zinc-800/40">
          {libraries.map((lib) => {
            const Icon = libTypeIcon(lib.type);
            const pct = max > 0 ? Math.max(2, (lib.totalSize / max) * 100) : 0;
            return (
              <div key={lib.id} className="px-4 py-2.5 flex items-center gap-3">
                <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-zinc-200 truncate">{lib.name}</span>
                    <span className="text-xs text-zinc-500 tabular-nums">{lib.itemCount.toLocaleString()} items</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-lime-500 to-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-white tabular-nums w-20 text-right">
                  {formatBytes(lib.totalSize)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}