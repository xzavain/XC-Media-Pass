import React from "react";
import { Clock, Play, Wifi, Activity } from "lucide-react";

function formatWatchTime(seconds) {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatBandwidth(kb) {
  if (!kb) return "0 MB";
  if (kb < 1024) return `${Math.round(kb)} KB`;
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1024 / 1024).toFixed(2)} GB`;
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
      <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wide">
        <Icon className={`w-4 h-4 ${accent}`} /> {label}
      </div>
      <div className="text-2xl font-bold text-zinc-100 mt-1">{value}</div>
    </div>
  );
}

// Statistics — high-level analytics from historical session data.
export default function StatisticsSection({ stats }) {
  const { totalPlays, watchSeconds, bandwidthKB, transcodeCount, directCount, resolutionCounts } = stats;
  const totalFmt = transcodeCount + directCount || 1;
  const transcodePct = Math.round((transcodeCount / totalFmt) * 100);
  const directPct = 100 - transcodePct;
  const topRes = Object.entries(resolutionCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Watch Time" value={formatWatchTime(watchSeconds)} accent="text-lime-400" />
        <StatCard icon={Play} label="Total Plays" value={totalPlays} accent="text-sky-400" />
        <StatCard icon={Wifi} label="Bandwidth" value={formatBandwidth(bandwidthKB)} accent="text-violet-400" />
        <StatCard icon={Activity} label="Top Quality" value={topRes ? topRes[0] : "—"} accent="text-amber-400" />
      </div>
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-zinc-300 mb-3">Playback Method</h4>
        <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800">
          <div className="bg-lime-500" style={{ width: `${directPct}%` }} />
          <div className="bg-amber-500" style={{ width: `${transcodePct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-lime-400">Direct Play {directPct}% ({directCount})</span>
          <span className="text-amber-400">Transcode {transcodePct}% ({transcodeCount})</span>
        </div>
      </div>
    </div>
  );
}