import React, { useState } from "react";
import { Rows, List, Grid2x2, Grid3x3, Image as ImageIcon, LayoutGrid, AlignLeft, ChevronDown } from "lucide-react";

const MODES = [
  { id: "details", label: "Details", icon: Rows },
  { id: "list", label: "List", icon: List },
  { id: "small_icons", label: "Small icons", icon: Grid2x2 },
  { id: "medium_icons", label: "Medium icons", icon: Grid3x3 },
  { id: "large_icons", label: "Large icons", icon: ImageIcon },
  { id: "tiles", label: "Tiles", icon: LayoutGrid },
  { id: "content", label: "Content", icon: AlignLeft },
];

// Windows 11-style view mode dropdown for the folder view.
export default function ViewModeSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = MODES.find((m) => m.id === value) || MODES[0];
  const CurrentIcon = current.icon;

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/60 text-xs text-zinc-300 hover:bg-zinc-700/60 transition-colors"
      >
        <CurrentIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-zinc-800 border border-zinc-700 rounded-md shadow-xl py-1">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => { onChange(m.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${value === m.id ? "bg-violet-500/20 text-violet-300" : "text-zinc-300 hover:bg-zinc-700/60"}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {m.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}