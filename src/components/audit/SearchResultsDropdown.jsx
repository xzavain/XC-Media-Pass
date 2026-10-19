import React from "react";
import { ChevronRight, Loader2, File, Folder } from "lucide-react";

export default function SearchResultsDropdown({ results, searching, onJump }) {
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-30">
      {searching && (
        <div className="flex items-center gap-2 px-3 py-3 text-xs text-zinc-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" /> Searching entire drive…
        </div>
      )}
      {!searching && results.length === 0 && (
        <div className="px-3 py-4 text-xs text-zinc-600 text-center">No matches found.</div>
      )}
      {results.map((r, i) => (
        <button
          key={i}
          onClick={() => onJump(r)}
          className="w-full text-left px-3 py-2 hover:bg-zinc-800/60 border-b border-zinc-800/40 last:border-0"
        >
          <div className="flex items-center gap-2 text-sm text-zinc-200">
            {r.isDirectory ? <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /> : <File className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />}
            <span className="truncate font-medium">{r.name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-600 mt-0.5 pl-5 flex-wrap">
            {r.breadcrumb.map((b, bi) => (
              <React.Fragment key={bi}>
                {bi > 0 && <ChevronRight className="w-2.5 h-2.5 text-zinc-700" />}
                <span className="truncate max-w-[100px]">{b.name}</span>
              </React.Fragment>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}