import React from "react";
import { Film, Tv2, Music2, BookOpen, Loader2, ServerCrash } from "lucide-react";

const typeIcons = {
  movies: Film, movie: Film,
  tvshows: Tv2, show: Tv2,
  music: Music2, artist: Music2,
  books: BookOpen,
};

function LibItem({ lib, selected, onClick, platform }) {
  const Icon = typeIcons[lib.type] || Film;
  const isSelected = selected?.id === lib.id && selected?.platform === platform;
  return (
    <button
      onClick={() => onClick({ ...lib, platform })}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-sm transition-all
        ${isSelected
          ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
        }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{lib.name}</span>
    </button>
  );
}

export default function LibrarySidebar({ plexLibs, embyLibs, loadingPlex, loadingEmby, errorPlex, errorEmby, selected, onSelect }) {
  return (
    <aside className="w-56 flex-shrink-0 border-r border-zinc-800/60 bg-zinc-900/30 overflow-y-auto">
      <div className="p-3 space-y-4">
        {/* Emby / Jellyfin */}
        <div>
          <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-1 mb-1.5">Emby / Jellyfin</p>
          {loadingEmby && <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>}
          {errorEmby && <div className="flex items-center gap-2 px-3 py-1 text-xs text-rose-400"><ServerCrash className="w-3 h-3" /> {errorEmby}</div>}
          {!loadingEmby && !errorEmby && embyLibs.length === 0 && (
            <p className="text-xs text-zinc-600 px-3 py-1">No libraries. Configure server.</p>
          )}
          {embyLibs.map((lib) => (
            <LibItem key={lib.id} lib={lib} selected={selected} onClick={onSelect} platform="emby" />
          ))}
        </div>

        {/* Plex */}
        <div>
          <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-1 mb-1.5">Plex</p>
          {loadingPlex && <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>}
          {errorPlex && <div className="flex items-center gap-2 px-3 py-1 text-xs text-rose-400"><ServerCrash className="w-3 h-3" /> {errorPlex}</div>}
          {!loadingPlex && !errorPlex && plexLibs.length === 0 && (
            <p className="text-xs text-zinc-600 px-3 py-1">No libraries. Configure server.</p>
          )}
          {plexLibs.map((lib) => (
            <LibItem key={lib.id} lib={lib} selected={selected} onClick={onSelect} platform="plex" />
          ))}
        </div>
      </div>
    </aside>
  );
}