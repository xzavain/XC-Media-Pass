import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Play, ExternalLink, AlertCircle } from "lucide-react";
import { fetchTrailerVideos } from "@/lib/trailerApi";

export default function TrailerPlayerModal({ open, onOpenChange, tmdbId, mediaType, title }) {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  useEffect(() => {
    if (!open || !tmdbId) return;
    setLoading(true);
    setEmbedError(false);
    setVideos([]);
    setSelectedVideo(null);
    fetchTrailerVideos(tmdbId, mediaType)
      .then((data) => {
        setVideos(data.videos);
        setSelectedVideo(data.videos[0] || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, tmdbId, mediaType]);

  // Listen for YouTube iframe error events (Error 101/150 = embedding disabled by owner)
  useEffect(() => {
    if (!open || !selectedVideo) return;
    const handleMessage = (event) => {
      const validOrigins = ["https://www.youtube-nocookie.com", "https://www.youtube.com"];
      if (!validOrigins.includes(event.origin)) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "onError" && [100, 101, 150].includes(data.info)) {
          setEmbedError(true);
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, selectedVideo]);

  // ESC listener
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const embedUrl = selectedVideo
    ? `https://www.youtube-nocookie.com/embed/${selectedVideo.key}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`
    : null;

  const handleSelectVideo = (video) => {
    setEmbedError(false);
    setSelectedVideo(video);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-4xl p-0 overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">{title} — Trailer Player</DialogTitle>

        {/* Header bar — close button lives here, fully outside the YouTube viewport */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 rounded-t-xl">
          <div className="flex items-center gap-2 min-w-0">
            <Play className="w-4 h-4 text-red-500 flex-shrink-0 fill-red-500" />
            <span className="text-sm font-semibold text-slate-200 truncate">{title}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium flex-shrink-0">Official Trailer</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-300 text-xs font-semibold transition-colors flex-shrink-0"
          >
            <span>Close Preview</span>
            <span className="text-sm font-bold">✕</span>
          </button>
        </div>

        {/* Player container */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <span className="ml-3 text-sm text-slate-400">Loading trailers...</span>
            </div>
          ) : !selectedVideo ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">No trailers available for this title.</p>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(title + " official trailer")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" /> Search on YouTube
              </a>
            </div>
          ) : (
            <>
              {/* 16:9 responsive player — never clips or overflows */}
              <div className="relative w-full overflow-hidden rounded-xl bg-black pt-[56.25%] shadow-2xl">
                {embedError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-center p-6">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                    <p className="text-sm font-semibold text-white mb-1">Embedded playback blocked by studio permissions.</p>
                    <p className="text-xs text-slate-400 mb-4">This video cannot be embedded on third-party domains.</p>
                    <a
                      href={`https://www.youtube.com/watch?v=${selectedVideo.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                    >
                      <ExternalLink className="w-4 h-4" /> Watch directly on YouTube ↗
                    </a>
                  </div>
                ) : (
                  <iframe
                    id="trailer-iframe-player"
                    src={embedUrl}
                    title={selectedVideo.name}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                )}
              </div>

              {/* Fallback link (always visible when playing) */}
              {!embedError && (
                <a
                  href={`https://www.youtube.com/watch?v=${selectedVideo.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs text-slate-500 hover:text-slate-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  Having trouble? Watch directly on YouTube
                </a>
              )}

              {/* Multi-trailer switcher rail */}
              {videos.length > 1 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Available Videos &amp; Promos ({videos.length})
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
                    {videos.map((video) => {
                      const isActive = selectedVideo?.key === video.key;
                      return (
                        <button
                          key={video.id}
                          onClick={() => handleSelectVideo(video)}
                          className={`flex-shrink-0 flex flex-col gap-1 px-3 py-2 rounded-lg border text-left transition-all ${
                            isActive
                              ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                              : "border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isActive && <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />}
                            <span className={`text-xs font-semibold truncate max-w-[160px] ${isActive ? "text-white" : "text-slate-300"}`}>
                              {video.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              video.type === "Trailer" ? "bg-red-500/15 text-red-400" :
                              video.type === "Teaser" ? "bg-amber-500/15 text-amber-400" :
                              video.type === "Featurette" ? "bg-indigo-500/15 text-indigo-400" :
                              "bg-slate-700/50 text-slate-400"
                            }`}>
                              {video.type}
                            </span>
                            {video.size >= 1080 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 font-medium">
                                {video.size >= 2160 ? "4K" : "1080p"}
                              </span>
                            )}
                            {video.official && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">
                                Official
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}