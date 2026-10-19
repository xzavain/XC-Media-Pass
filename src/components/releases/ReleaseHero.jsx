import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { backdropUrl, posterUrl, daysUntil } from "@/lib/releaseApi";

export default function ReleaseHero({ releases, onAddToWatchlist, onSelectRelease, watchlistIds }) {
  const [index, setIndex] = useState(0);

  const upcoming = releases
    .filter((r) => {
      const d = daysUntil(r.digital_vod_release_date);
      return d !== null && d >= 0 && d <= 14;
    })
    .sort((a, b) => new Date(a.digital_vod_release_date) - new Date(b.digital_vod_release_date))
    .slice(0, 5);

  useEffect(() => {
    if (upcoming.length <= 1) return;
    const interval = setInterval(() => setIndex((i) => (i + 1) % upcoming.length), 6000);
    return () => clearInterval(interval);
  }, [upcoming.length]);

  if (upcoming.length === 0) return null;
  const release = upcoming[index];
  const days = daysUntil(release.digital_vod_release_date);
  const isBookmarked = watchlistIds?.includes(release.id);

  return (
    <div className="relative h-[420px] rounded-2xl overflow-hidden">
      {release.backdrop_path && (
        <img src={backdropUrl(release.backdrop_path, "original")} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm scale-105 opacity-50" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 to-transparent" />

      <div className="relative h-full flex items-end p-6 lg:p-8">
        <div className="flex gap-5 max-w-3xl">
          <img
            src={posterUrl(release.poster_path)}
            alt={release.title}
            className="w-28 h-44 lg:w-36 lg:h-52 rounded-xl shadow-2xl flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => onSelectRelease(release)}
          />
          <div className="space-y-3 flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-full animate-pulse">
                Arrives on VOD in {days} {days === 1 ? "Day" : "Days"}
              </span>
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold text-white truncate">{release.title}</h2>
            {release.tagline && <p className="text-sm text-slate-400 italic">{release.tagline}</p>}
            <p className="text-sm text-slate-300 line-clamp-3 max-w-2xl">{release.overview}</p>
            <div className="flex flex-wrap gap-1.5">
              {release.genres?.map((g) => (
                <span key={g} className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">{g}</span>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => onAddToWatchlist(release)}
                className={`gap-1.5 ${isBookmarked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
                {isBookmarked ? "On Watchlist" : "+ Add to Universal Watchlist"}
              </Button>
              {release.trailer_youtube_key && (
                <Button onClick={() => onSelectRelease(release)} variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 gap-1.5">
                  <Play className="w-4 h-4" /> Watch Trailer
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {upcoming.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-2">
          {upcoming.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-indigo-500" : "w-1.5 bg-slate-600"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}