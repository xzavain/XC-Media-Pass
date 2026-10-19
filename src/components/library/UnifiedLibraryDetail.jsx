import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Film, Tv, Star, Calendar, Server } from "lucide-react";

const platformStyles = {
  plex: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", label: "Plex" },
  emby: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", label: "Emby" },
  jellyfin: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", label: "Jellyfin" },
};

export default function UnifiedLibraryDetail({ item, onClose }) {
  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">{item.title}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Poster */}
          <div className="flex-shrink-0 w-32 sm:w-40 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
            {item.poster_url ? (
              <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {item.content_type === "show" ? (
                  <Tv className="w-8 h-8 text-zinc-600" />
                ) : (
                  <Film className="w-8 h-8 text-zinc-600" />
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-white/80">
                {item.content_type === "show" ? (
                  <><Tv className="w-3 h-3" /> TV Show</>
                ) : (
                  <><Film className="w-3 h-3" /> Movie</>
                )}
              </span>
              {item.year && (
                <span className="inline-flex items-center gap-1 text-white/60">
                  <Calendar className="w-3 h-3" /> {item.year}
                </span>
              )}
              {item.rating && (
                <span className="inline-flex items-center gap-1 text-white/60">
                  <Star className="w-3 h-3 text-amber-400" /> {item.rating.toFixed(1)}
                </span>
              )}
            </div>

            {item.summary && (
              <p className="text-sm text-white/70 leading-relaxed">{item.summary}</p>
            )}

            {item.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.genres.map((g) => (
                  <span key={g} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-white/60">{g}</span>
                ))}
              </div>
            )}

            {/* Server availability */}
            <div className="pt-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80 mb-2">
                <Server className="w-3.5 h-3.5" />
                Available on {item.servers.length} server{item.servers.length > 1 ? "s" : ""}
              </div>
              <div className="flex flex-wrap gap-2">
                {item.servers.map((s, i) => {
                  const style = platformStyles[s.platform] || platformStyles.plex;
                  return (
                    <div
                      key={`${s.server_id}-${i}`}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${style.bg} ${style.border} border`}
                    >
                      <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
                      <span className="text-xs text-white/70">{s.server_name}</span>
                      <span className="text-[10px] text-white/40">· {s.library_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}