import React from "react";
import { Lock, Play, Film } from "lucide-react";

export default function ContentTile({ item, locked, onClick }) {
  return (
    <button
      onClick={() => onClick(item)}
      className="relative flex-shrink-0 w-40 sm:w-48 aspect-video rounded-lg overflow-hidden bg-zinc-800 group text-left"
    >
      {item.thumbnail_url ? (
        <img
          src={item.thumbnail_url}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Film className="w-6 h-6 text-zinc-600" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
        <p className="text-xs font-medium text-white truncate">{item.title}</p>
      </div>
      {locked ? (
        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center">
          <Lock className="w-3 h-3 text-amber-400" />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-4 h-4 text-black fill-black ml-0.5" />
          </div>
        </div>
      )}
    </button>
  );
}