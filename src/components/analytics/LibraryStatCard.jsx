import React from "react";
import { Database, TrendingUp, TrendingDown, Film } from "lucide-react";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { formatBytes } from "@/lib/formatBytes";

export default function LibraryStatCard({ server, library, stats, baselineSnapshot }) {
  const itemCount = stats?.itemCount ?? 0;
  const storageBytes = stats?.storageBytes ?? 0;

  const hasTrend = !!baselineSnapshot;
  const delta = hasTrend ? storageBytes - baselineSnapshot.storage_bytes : 0;
  const projected30d = hasTrend ? storageBytes + delta * 4 : null;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={server.platform} />
          <span className="text-sm font-semibold text-zinc-200">{library.name}</span>
        </div>
        <span className="text-xs text-zinc-500">{server.name}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/40 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
            <Film className="w-3.5 h-3.5" /> Items
          </div>
          <p className="text-lg font-semibold text-zinc-100">{itemCount.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800/40 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
            <Database className="w-3.5 h-3.5" /> Storage
          </div>
          <p className="text-lg font-semibold text-zinc-100">{formatBytes(storageBytes)}</p>
        </div>
      </div>

      {hasTrend ? (
        <div className="border-t border-zinc-800/60 pt-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            {delta >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-lime-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className={delta >= 0 ? "text-lime-400" : "text-rose-400"}>
              {delta >= 0 ? "+" : "-"}{formatBytes(Math.abs(delta))}
            </span>
            <span className="text-zinc-500">this week</span>
          </div>
          <p className="text-xs text-zinc-500">
            Projected in 30 days: <span className="text-zinc-300">{formatBytes(Math.max(0, projected30d))}</span>
          </p>
        </div>
      ) : (
        <p className="text-xs text-zinc-600 border-t border-zinc-800/60 pt-3">Building growth trend — check back in a few days</p>
      )}
    </div>
  );
}