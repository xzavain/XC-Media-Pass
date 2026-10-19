import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bookmark, BookmarkCheck, Mail, Bell, MessageCircle, Star, Play } from "lucide-react";
import { useTrailerModal } from "@/hooks/useTrailerModal.jsx";
import { posterUrl, backdropUrl, fetchTmdbDetails } from "@/lib/releaseApi";
import CastAvatarRail from "./CastAvatarRail";

export default function ReleaseDetailModal({ release, open, onOpenChange, isBookmarked, onToggleWatchlist, watchlistItem, onUpdateWatchlistPrefs, notifPrefs, onUpdateNotifPrefs, onSelectPerson }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const { openTrailer, modal: trailerModal } = useTrailerModal();

  useEffect(() => {
    if (!release || !open) return;
    setLoading(true);
    fetchTmdbDetails(release.tmdb_id, release.media_type)
      .then((d) => setDetails(d))
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [release, open]);

  if (!release) return null;

  const cast = details?.cast || [];
  const crew = details?.crew || [];
  const director = details?.director;
  const rating = details?.vote_average || release.vote_average;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Backdrop */}
        <div className="relative -mx-6 -mt-6 h-48 overflow-hidden rounded-t-lg">
          {(release.backdrop_path || details?.backdrop_path) && (
            <img src={backdropUrl(details?.backdrop_path || release.backdrop_path, "original")} alt="" className="w-full h-full object-cover opacity-40 blur-sm" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>

        <DialogHeader className="relative -mt-20">
          <div className="flex gap-4">
            <img src={posterUrl(details?.poster_path || release.poster_path)} alt={release.title} className="w-24 h-36 rounded-lg shadow-2xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-bold text-white">{details?.title || release.title}</DialogTitle>
              {details?.tagline && <p className="text-sm text-slate-400 italic mt-1">{details.tagline}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {rating > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    <Star className="w-3 h-3 fill-amber-400" /> {rating.toFixed(1)}
                  </span>
                )}
                {release.certification && <span className="text-xs border border-slate-600 px-1.5 py-0.5 rounded text-slate-300">{release.certification}</span>}
                {release.runtime_minutes > 0 && <span className="text-xs text-slate-400">{release.runtime_minutes}min</span>}
                {release.genres?.map((g) => <span key={g} className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">{g}</span>)}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Trailer — opens compliant player modal with multi-trailer picker */}
        <Button
          onClick={() => openTrailer({ tmdbId: release.tmdb_id, mediaType: release.media_type, title: details?.title || release.title })}
          className="w-full gap-1.5 bg-red-600 hover:bg-red-700 text-white"
        >
          <Play className="w-4 h-4" /> Watch Trailer
        </Button>
        {trailerModal}

        {/* Synopsis */}
        <p className="text-sm text-slate-300">{details?.overview || release.overview}</p>

        {/* Director & Studio */}
        {(director || details?.studio || release.studio) && (
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            {director && <span>Director: <span className="text-slate-300">{director}</span></span>}
            {(details?.studio || release.studio) && <span>Studio: <span className="text-slate-300">{details?.studio || release.studio}</span></span>}
          </div>
        )}

        {/* Cast & Crew Avatar Rail */}
        {(cast.length > 0 || crew.length > 0) && (
          <CastAvatarRail cast={cast} crew={crew} onSelectPerson={onSelectPerson} />
        )}

        {/* Notification subscribe toggles */}
        <div className="space-y-3 p-4 rounded-lg border border-slate-800 bg-slate-900/40">
          <p className="text-sm font-semibold text-slate-200">Notification Preferences</p>
          <label className="flex items-center justify-between text-xs text-slate-300">
            <span>Alert me on Digital VOD Release Date</span>
            <Switch checked={watchlistItem?.notify_digital_vod ?? true} onCheckedChange={(v) => onUpdateWatchlistPrefs("notify_digital_vod", v)} />
          </label>
          <label className="flex items-center justify-between text-xs text-slate-300">
            <span>Alert me when imported to server</span>
            <Switch checked={watchlistItem?.notify_server_import ?? true} onCheckedChange={(v) => onUpdateWatchlistPrefs("notify_server_import", v)} />
          </label>
          <label className="flex items-center justify-between text-xs text-slate-300">
            <span>Alert me on Theatrical Release</span>
            <Switch checked={watchlistItem?.notify_theatrical ?? false} onCheckedChange={(v) => onUpdateWatchlistPrefs("notify_theatrical", v)} />
          </label>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <p className="text-xs text-slate-500">Delivery Channels:</p>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <Switch checked={notifPrefs?.email_enabled ?? true} onCheckedChange={(v) => onUpdateNotifPrefs("email_enabled", v)} />
              <Mail className="w-3.5 h-3.5 text-slate-500" /> Email
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <Switch checked={notifPrefs?.browser_push_enabled ?? false} onCheckedChange={(v) => onUpdateNotifPrefs("browser_push_enabled", v)} />
              <Bell className="w-3.5 h-3.5 text-slate-500" /> Browser Push
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <Switch checked={notifPrefs?.discord_notifications_enabled ?? false} onCheckedChange={(v) => onUpdateNotifPrefs("discord_notifications_enabled", v)} />
              <MessageCircle className="w-3.5 h-3.5 text-slate-500" /> Discord DM/Ping
            </label>
          </div>
        </div>

        {/* Bookmark button */}
        <Button
          onClick={() => onToggleWatchlist(release)}
          className={`w-full gap-1.5 ${isBookmarked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
        >
          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          {isBookmarked ? "✓ In Watchlist" : "+ Add to Watchlist"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}