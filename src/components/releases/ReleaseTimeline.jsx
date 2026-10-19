import React from "react";
import ReleaseCard from "@/components/releases/ReleaseCard";
import { groupReleasesByTime, GROUP_LABELS } from "@/lib/releaseApi";

export default function ReleaseTimeline({ releases, watchlistIds, onToggleWatchlist, onSelectRelease, onWatchTrailer }) {
  const groups = groupReleasesByTime(releases);

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([key, items]) => {
        if (items.length === 0) return null;
        return (
          <div key={key}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold text-slate-200">{GROUP_LABELS[key]}</h3>
              <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">{items.length}</span>
              <div className="flex-1 h-px bg-slate-800/60" />
            </div>
            <div className="space-y-3">
              {items.map((r) => (
                <ReleaseCard
                  key={r.id}
                  release={r}
                  isBookmarked={watchlistIds.includes(r.id)}
                  onToggleWatchlist={onToggleWatchlist}
                  onSelect={onSelectRelease}
                  onWatchTrailer={onWatchTrailer}
                />
              ))}
            </div>
          </div>
        );
      })}
      {releases.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-500">
          No releases tracked yet. Check back soon for upcoming titles.
        </div>
      )}
    </div>
  );
}