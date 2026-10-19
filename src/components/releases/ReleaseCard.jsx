import React from "react";
import { Bookmark, BookmarkCheck, Clock, Server, Star, Play } from "lucide-react";
import { posterUrl, daysUntil } from "@/lib/releaseApi";

function MilestoneChip({ label, date, server, type }) {
  const days = daysUntil(date);
  const hasDate = !!date;
  const isPast = days !== null && days < 0;
  const isToday = days === 0;

  const dotColor = type === "theatrical" ? "bg-blue-500" : type === "vod" ? "bg-purple-500" : "bg-emerald-500";
  const textColor = isPast ? "text-emerald-400" : hasDate ? "text-slate-300" : "text-slate-600";

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`w-1.5 h-1.5 rounded-full ${hasDate ? dotColor : "bg-slate-700"}`} />
      <span className="text-slate-500 font-medium">{label}:</span>
      {hasDate ? (
        <span className={textColor}>
          {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {!isPast && days > 0 && <span className="text-indigo-400 ml-1 font-semibold">({days}d)</span>}
          {isToday && <span className="text-indigo-400 ml-1 font-semibold animate-pulse">(TODAY)</span>}
          {server && <span className="text-slate-500 ml-1">· {server}</span>}
        </span>
      ) : (
        <span className="text-slate-600">TBD</span>
      )}
    </div>
  );
}

export default function ReleaseCard({ release, isBookmarked, onToggleWatchlist, onSelect, onWatchTrailer }) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4 hover:border-indigo-500/30 transition-colors group">
      <img
        src={posterUrl(release.poster_path)}
        alt={release.title}
        className="w-20 h-32 rounded-lg cursor-pointer flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform"
        onClick={() => onSelect(release)}
      />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white cursor-pointer hover:text-indigo-400 transition-colors truncate" onClick={() => onSelect(release)}>
              {release.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              {release.theatrical_release_date && <span>{new Date(release.theatrical_release_date).getFullYear()}</span>}
              {release.certification && <span className="border border-slate-700 px-1 rounded text-[10px]">{release.certification}</span>}
              {release.runtime_minutes > 0 && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {release.runtime_minutes}m</span>}
              {release.studio && <span className="truncate">{release.studio}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {release.vote_average > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-1.5 py-1 rounded">
                <Star className="w-3 h-3 fill-amber-400" /> {release.vote_average.toFixed(1)}
              </span>
            )}
            {release.trailer_youtube_key && (
              <button
                onClick={(e) => { e.stopPropagation(); onWatchTrailer?.(release); }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                title="Watch Trailer"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onToggleWatchlist(release)}
              className={`p-1.5 rounded-lg transition-colors ${isBookmarked ? "text-indigo-400 bg-indigo-500/10" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"}`}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Triple milestone status bar */}
        <div className="space-y-1 pt-1 border-t border-slate-800/50">
          <MilestoneChip label="Theatrical" date={release.theatrical_release_date} type="theatrical" />
          <MilestoneChip label="Digital VOD" date={release.digital_vod_release_date} type="vod" />
          <MilestoneChip
            label="Server Ready"
            date={release.estimated_server_arrival_date}
            server={release.target_servers?.[0]}
            type="server"
          />
        </div>

        {/* Server import status pill */}
        {release.server_import_status === "imported_live" && (
          <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full w-fit">
            <Server className="w-3 h-3" /> Ready to Stream
          </div>
        )}
      </div>
    </div>
  );
}