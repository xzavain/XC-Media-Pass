import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, ExternalLink, ChevronDown, Bookmark, BookmarkCheck, Film } from "lucide-react";
import { fetchPersonDetails, fetchPersonImages, fetchPersonCredits, profileUrl, posterUrl } from "@/lib/releaseApi";

export default function PersonProfileDrawer({ person, open, onOpenChange, onSelectRelease, watchlistIds, onToggleWatchlist }) {
  const [details, setDetails] = useState(null);
  const [images, setImages] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    if (!person?.id || !open) return;
    setLoading(true);
    setBioExpanded(false);
    Promise.all([
      fetchPersonDetails(person.id),
      fetchPersonImages(person.id),
      fetchPersonCredits(person.id),
    ]).then(([d, imgs, cr]) => {
      setDetails(d);
      setImages(imgs?.profiles || []);
      setCredits(cr);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [person, open]);

  if (!person) return null;

  const castCredits = credits?.cast || [];
  const now = new Date();
  const upcoming = castCredits
    .filter((c) => c.release_date && new Date(c.release_date) > now)
    .sort((a, b) => new Date(a.release_date) - new Date(b.release_date))
    .slice(0, 6);
  const knownFor = [...castCredits].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 8);
  const filmography = [...castCredits]
    .filter((c) => c.release_date || c.first_air_date)
    .sort((a, b) => new Date(b.release_date || b.first_air_date || 0) - new Date(a.release_date || a.first_air_date || 0));

  const age = details?.birthday ? Math.floor((new Date() - new Date(details.birthday)) / (1000 * 60 * 60 * 24 * 365.25)) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl bg-slate-950 border-slate-800 text-slate-100 overflow-y-auto p-0">
        {loading ? (
          <div className="flex items-center justify-center h-full py-24"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
        ) : details ? (
          <div className="space-y-5 p-6">
            {/* Identity Header */}
            <SheetHeader>
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 flex-shrink-0">
                  {details.profile_path ? (
                    <img src={profileUrl(details.profile_path, "w185")} alt={details.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-2xl font-bold">{details.name?.charAt(0)}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl font-bold text-white">{details.name}</SheetTitle>
                  <p className="text-sm text-indigo-400 mt-0.5">{details.known_for_department || "Acting"}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
                    {details.birthday && <span>🎂 {new Date(details.birthday).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}{age != null ? ` (${age} yrs)` : ""}</span>}
                    {details.place_of_birth && <span>📍 {details.place_of_birth}</span>}
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* External Links */}
            <div className="flex gap-2">
              <a href={`https://www.themoviedb.org/person/${details.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700">
                <ExternalLink className="w-3 h-3" /> TMDB Profile
              </a>
              {details.imdb_id && (
                <a href={`https://www.imdb.com/name/${details.imdb_id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30">
                  <ExternalLink className="w-3 h-3" /> IMDb Profile
                </a>
              )}
            </div>

            {/* Biography */}
            {details.biography && (
              <div>
                <p className={`text-sm text-slate-300 leading-relaxed ${!bioExpanded ? "line-clamp-4" : ""}`}>{details.biography}</p>
                {details.biography.length > 200 && (
                  <button onClick={() => setBioExpanded(!bioExpanded)} className="text-xs text-indigo-400 hover:underline mt-1 flex items-center gap-1">
                    {bioExpanded ? "Show Less" : "Read More"} <ChevronDown className={`w-3 h-3 transition-transform ${bioExpanded ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
            )}

            {/* Photo Gallery */}
            {images.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-2">Photo Gallery</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.slice(0, 10).map((img, i) => (
                    <button key={i} onClick={() => setLightboxImage(profileUrl(img.file_path, "w500"))} className="flex-shrink-0 w-24 h-32 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 hover:border-indigo-500 transition-colors">
                      <img src={profileUrl(img.file_path, "w185")} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Projects */}
            {upcoming.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-2">Upcoming Projects</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {upcoming.map((c, i) => {
                    const release = {
                      id: `tmdb-${c.id}`,
                      tmdb_id: c.id,
                      title: c.title || c.name,
                      media_type: c.media_type || (c.title ? "movie" : "tv_show"),
                      poster_path: c.poster_path,
                      theatrical_release_date: c.release_date || c.first_air_date,
                    };
                    const isBookmarked = watchlistIds?.includes(release.id);
                    return (
                      <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 space-y-1.5">
                        <div className="flex gap-2">
                          {c.poster_path && <img src={posterUrl(c.poster_path, "w92")} alt="" className="w-10 h-14 rounded object-cover flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{c.title || c.name}</p>
                            <p className="text-[10px] text-indigo-400">{new Date(c.release_date || c.first_air_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                            {c.character && <p className="text-[10px] text-slate-500 truncate">as {c.character}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => onToggleWatchlist?.(release)}
                          className={`w-full text-[10px] py-1 rounded flex items-center justify-center gap-1 transition-colors ${isBookmarked ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                        >
                          {isBookmarked ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                          {isBookmarked ? "In Watchlist" : "+ Watchlist"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Known For */}
            {knownFor.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-2">Known For</p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {knownFor.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectRelease?.({ id: `tmdb-${c.id}`, tmdb_id: c.id, title: c.title || c.name, media_type: c.media_type || (c.title ? "movie" : "tv_show"), poster_path: c.poster_path })}
                      className="text-center group"
                    >
                      <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-slate-800 border border-slate-700 group-hover:border-indigo-500 transition-colors">
                        {c.poster_path ? <img src={posterUrl(c.poster_path, "w185")} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-4 h-4 text-slate-600" /></div>}
                      </div>
                      <p className="text-[10px] text-slate-300 truncate mt-1 group-hover:text-indigo-400">{c.title || c.name}</p>
                      <p className="text-[9px] text-slate-600">{(c.release_date || c.first_air_date || "").substring(0, 4)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Full Filmography */}
            {filmography.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-2">Full Filmography ({filmography.length} credits)</p>
                <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
                  {filmography.map((c, i) => {
                    const year = (c.release_date || c.first_air_date || "").substring(0, 4);
                    return (
                      <button
                        key={i}
                        onClick={() => onSelectRelease?.({ id: `tmdb-${c.id}`, tmdb_id: c.id, title: c.title || c.name, media_type: c.media_type || (c.title ? "movie" : "tv_show"), poster_path: c.poster_path })}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-800/60 text-left border-b border-slate-800/40"
                      >
                        <span className="text-xs font-mono text-slate-500 w-10 flex-shrink-0">{year || "—"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-200 truncate">{c.title || c.name}</p>
                          {c.character && <p className="text-[10px] text-slate-500 truncate">as {c.character}</p>}
                        </div>
                        <span className="text-[10px] text-slate-600 flex-shrink-0">{c.media_type === "tv" ? "TV" : "Film"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-500">Failed to load profile.</div>
        )}
      </SheetContent>

      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setLightboxImage(null)}>
          <img src={lightboxImage} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </Sheet>
  );
}