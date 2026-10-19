import React from "react";
import { Film, Tv, Star } from "lucide-react";

const platformStyles = {
  plex: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", label: "Plex" },
  emby: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", label: "Emby" },
  jellyfin: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", label: "Jellyfin" },
};

function ServerBadge({ server }) {
  const style = platformStyles[server.platform] || platformStyles.plex;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text} ${style.border} border`}>
      {style.label}
      <span className="text-white/60 hidden sm:inline">·</span>
      <span className="text-white/70 hidden sm:inline truncate max-w-[80px]">{server.server_name}</span>
    </span>
  );
}

export default function UnifiedLibraryCard({ item, onClick }) {
  return (
    <button
      onClick={() => onClick(item)}
      className="group relative flex flex-col text-left rounded-xl overflow-hidden bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 hover:shadow-lg hover:shadow-black/30"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] bg-zinc-800 overflow-hidden">
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.content_type === "show" ? (
              <Tv className="w-8 h-8 text-zinc-600" />
            ) : (
              <Film className="w-8 h-8 text-zinc-600" />
            )}
          </div>
        )}
        {/* Server count badge */}
        {item.server_count > 1 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/80 text-[10px] font-bold text-white border border-white/20">
            {item.server_count} servers
          </div>
        )}
        {/* Content type indicator */}
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center">
          {item.content_type === "show" ? (
            <Tv className="w-3.5 h-3.5 text-white" />
          ) : (
            <Film className="w-3.5 h-3.5 text-white" />
          )}
        </div>
      </div>

      {/* Info tray */}
      <div className="p-3 flex flex-col gap-2">
        <div className="min-h-[2.5rem]">
          <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">{item.title}</h3>
          {item.year && (
            <p className="text-xs text-white/50 mt-0.5">{item.year}</p>
          )}
        </div>

        {/* Server badges */}
        <div className="flex flex-wrap gap-1">
          {item.servers.map((s, i) => (
            <ServerBadge key={`${s.server_id}-${i}`} server={s} />
          ))}
        </div>

        {/* Rating */}
        {item.rating && (
          <div className="flex items-center gap-1 text-xs text-white/60">
            <Star className="w-3 h-3 text-amber-400" />
            <span>{item.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </button>
  );
}