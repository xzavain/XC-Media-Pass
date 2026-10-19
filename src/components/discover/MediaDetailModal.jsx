import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Clock, Calendar, Tv, Film, Play, Bookmark, BookmarkCheck, Loader2, X } from "lucide-react";
import { fetchMediaDetail, posterUrl, backdropUrl } from "@/lib/mediaDiscoveryApi";
import ErrorBoundary from "@/components/ErrorBoundary";
import PosterImage from "./PosterImage";
import CastCard from "./CastCard";
import SeasonSelector from "./SeasonSelector";
import MoreLikeThis from "./MoreLikeThis";
import { useTrailerModal } from "@/hooks/useTrailerModal.jsx";
import WhereToStreamBadges from "./WhereToStreamBadges";
import PersonProfileDrawer from "@/components/releases/PersonProfileDrawer";

export default function MediaDetailModal({ item, open, onOpenChange, watchlist, onToggleWatchlist, onItemChange }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const { openTrailer, modal: trailerModal } = useTrailerModal();
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => {
    if (!open || !item) return;
    setDetail(null);
    setLoading(true);
    fetchMediaDetail(item.tmdb_id, item.media_type, item.title)
      .then((d) => setDetail(d || item))
      .catch(() => setDetail(item))
      .finally(() => setLoading(false));
  }, [open, item]);

  if (!item) return null;

  const isTv = (detail?.media_type || item.media_type) === "tv";
  const inWatchlist = watchlist?.some(
    (w) => w.tmdb_id === item.tmdb_id && w.media_type === item.media_type
  );

  const title = detail?.title || item.title;
  const backdrop = backdropUrl(detail?.backdrop_path || item.backdrop_path, "original");
  const poster = posterUrl(detail?.poster_path || item.poster_path, "w500");
  const genres = detail?.genres || item.genres || [];
  const providers = detail?.streaming_providers || item.streaming_providers || [];
  const cast = detail?.cast || [];
  const seasons = detail?.seasons || [];
  const similar = detail?.similar || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-800 p-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Cinematic backdrop banner — authentic horizontal TMDB backdrop, never stretched poster */}
        <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden">
          {backdrop ? (
            <img src={backdrop} alt={title} className="w-full h-full object-cover object-top" onError={(e) => (e.target.style.display = "none")} />
          ) : (
            <div className="w-full h-full bg-gradient-to-t from-slate-950 via-slate-900 to-slate-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-900/80 backdrop-blur-sm flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 pb-6 -mt-24 relative">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Proportional poster — strict 2:3 aspect ratio, object-cover prevents stretching */}
            <div className="flex-shrink-0 w-32 sm:w-44 md:w-52 mx-auto sm:mx-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden border-2 border-slate-700/60 shadow-2xl">
                <PosterImage src={poster} alt={title} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Key info */}
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-zinc-400">
                  {isTv ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                  <span>{isTv ? "TV Series" : "Movie"}</span>
                  {detail?.release_date && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{detail.release_date.substring(0, 4)}</span>
                    </>
                  )}
                  {detail?.runtime > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{detail.runtime}m</span>
                    </>
                  )}
                  {(detail?.content_rating || item.content_rating) && (
                    <>
                      <span>•</span>
                      <span className="bg-zinc-800 text-zinc-300 text-xs px-1.5 py-0.5 rounded font-semibold">
                        {detail?.content_rating || item.content_rating}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Ratings bar */}
              <div className="flex flex-wrap gap-2">
                {detail?.vote_average > 0 && (
                  <RatingBadge icon={<Star className="w-4 h-4 text-lime-400 fill-lime-400" />} label="TMDB" value={detail.vote_average.toFixed(1)} />
                )}
                {detail?.imdb_rating > 0 && (
                  <RatingBadge icon={<span className="text-sm font-bold text-yellow-500">IMDb</span>} value={detail.imdb_rating.toFixed(1)} />
                )}
                {detail?.rt_tomatometer > 0 && (
                  <RatingBadge
                    icon={<span className="text-sm font-bold" style={{ color: detail.rt_tomatometer >= 60 ? "#e92424" : "#9ca3af" }}>RT</span>}
                    value={`${detail.rt_tomatometer}%`}
                    label="Tomatometer"
                  />
                )}
                {detail?.rt_audience > 0 && (
                  <RatingBadge
                    icon={<span className="text-sm font-bold text-orange-400">Aud</span>}
                    value={`${detail.rt_audience}%`}
                    label="Audience"
                  />
                )}
                {item.vote_average > 0 && !detail?.vote_average && (
                  <RatingBadge icon={<Star className="w-4 h-4 text-lime-400 fill-lime-400" />} value={item.vote_average.toFixed(1)} />
                )}
              </div>

              {/* Genres */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <span key={g} className="text-xs text-zinc-300 bg-zinc-800/60 border border-zinc-700/50 px-2 py-1 rounded">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Where to Stream */}
              <WhereToStreamBadges providers={providers} tmdbId={item.tmdb_id} mediaType={item.media_type} />

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  onClick={() => onToggleWatchlist(item)}
                  variant={inWatchlist ? "default" : "outline"}
                  className={inWatchlist ? "bg-lime-600 hover:bg-lime-700 text-white" : "border-zinc-700 text-zinc-200 hover:bg-zinc-800"}
                >
                  {inWatchlist ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
                </Button>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
              <span className="ml-2 text-sm text-zinc-500">Loading details...</span>
            </div>
          )}

          {/* Detail content */}
          {!loading && detail && (
            <ErrorBoundary>
            <div className="mt-6 space-y-6">
              {/* Overview */}
              {detail.overview && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-2">Overview</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{detail.overview}</p>
                </div>
              )}

              {/* Trailer — opens compliant player modal with multi-trailer picker */}
              <div>
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Play className="w-4 h-4" /> Trailer
                </h3>
                <Button
                  onClick={() => openTrailer({ tmdbId: item.tmdb_id, mediaType: item.media_type, title })}
                  className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Play className="w-4 h-4" /> Watch Trailer
                </Button>
                {trailerModal}
              </div>

              {/* Season selector for TV */}
              {isTv && seasons.length > 0 && (
                <SeasonSelector tmdbId={item.tmdb_id} title={title} seasons={seasons} />
              )}

              {/* Cast */}
              {cast.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">Cast & Crew</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                    {cast.map((member, i) => (
                      <CastCard key={`${member.name}-${i}`} member={member} onClick={() => setSelectedPerson(member)} />
                    ))}
                  </div>
                  {detail.directors?.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-3">
                      <span className="text-zinc-400">Director{detail.directors.length > 1 ? "s" : ""}:</span> {detail.directors.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {/* More Like This */}
              {similar.length > 0 && (
                <MoreLikeThis items={similar} onCardClick={(newItem) => onItemChange?.(newItem)} />
              )}

              {/* Technical info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800">
                {detail.status && <InfoRow label="Status" value={detail.status} />}
                {isTv && detail.number_of_seasons > 0 && <InfoRow label="Seasons" value={detail.number_of_seasons} />}
                {isTv && detail.number_of_episodes > 0 && <InfoRow label="Episodes" value={detail.number_of_episodes} />}
                {detail.network && <InfoRow label="Network / Studio" value={detail.network} />}
                {detail.original_language && <InfoRow label="Language" value={detail.original_language} />}
              </div>
            </div>
            </ErrorBoundary>
          )}
        </div>
      </DialogContent>

      <PersonProfileDrawer
        person={selectedPerson}
        open={!!selectedPerson}
        onOpenChange={(v) => !v && setSelectedPerson(null)}
        onSelectRelease={(release) => {
          setSelectedPerson(null);
          onItemChange?.(release);
        }}
        watchlistIds={watchlist?.map((w) => `tmdb-${w.tmdb_id}`) || []}
        onToggleWatchlist={(release) => {
          onToggleWatchlist?.({
            tmdb_id: release.tmdb_id,
            media_type: release.media_type === "tv_show" ? "tv" : "movie",
            title: release.title,
            poster_path: release.poster_path,
          });
        }}
      />
    </Dialog>
  );
}

function RatingBadge({ icon, value, label }) {
  return (
    <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
      {icon}
      <span className="text-sm font-bold text-white">{value}</span>
      {label && <span className="text-xs text-zinc-500">{label}</span>}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-zinc-200 mt-0.5">{value}</p>
    </div>
  );
}