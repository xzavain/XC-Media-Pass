import React from "react";
import { Star, X } from "lucide-react";

export default function QuickAccessPanel({ pins, activePath, onNavigate, onUnpin }) {
  if (pins.length === 0) {
    return (
      <div className="px-3 pt-2 pb-1 border-b border-zinc-800/40">
        <p className="text-xs text-zinc-600 uppercase tracking-wider mb-1.5 font-semibold">Quick Access</p>
        <p className="text-xs text-zinc-700 px-1 pb-1">Pin folders (star icon) to see them here.</p>
      </div>
    );
  }

  return (
    <div className="px-1 pt-2 pb-1 border-b border-zinc-800/40">
      <p className="text-xs text-zinc-600 uppercase tracking-wider px-2 mb-1.5 font-semibold">Quick Access</p>
      {pins.map((pin, i) => (
        <div
          key={i}
          className={`group flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer mb-0.5
            ${activePath === pin.path ? "bg-violet-500/10 text-violet-300" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
          onClick={() => onNavigate(pin)}
        >
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
          <span className="truncate flex-1">{pin.label}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onUnpin(pin); }}
            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}