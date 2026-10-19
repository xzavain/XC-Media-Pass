import React from "react";
import { Star } from "lucide-react";
import FileThumb from "@/components/audit/FileThumb";
import { mergeEntryInfo } from "@/lib/folderInfoMap";
import { isPinned } from "@/lib/fileManagerStorage";
import { isImageFile } from "@/lib/fileUtils";

// Windows "Small / Medium / Large icons" view — a responsive grid of
// poster thumbnails (for media) or file-type icons with names beneath.
export default function FileIconGrid({ entries, infoMap, metaLoading, serverUrl, size = 80, onNavigate, onImageClick, onTogglePin, onShowProperties }) {
  const merged = (entries || [])
    .map((e) => mergeEntryInfo(e, infoMap, metaLoading))
    .sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1));

  const handleClick = (entry) => {
    if (entry.isDirectory) onNavigate?.(entry.path, entry.name);
    else if (isImageFile(entry.name)) onImageClick?.(entry);
    else onShowProperties?.(entry);
  };

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size + 24}px, 1fr))` }}>
        {merged.map((entry, i) => {
          const pinned = entry.isDirectory && isPinned(serverUrl, entry.path);
          return (
            <div
              key={i}
              onClick={() => handleClick(entry)}
              className="group relative flex flex-col items-center gap-1.5 p-2 rounded-lg cursor-pointer hover:bg-zinc-800/40 transition-colors"
            >
              {entry.isDirectory && (
                <button
                  onClick={(e) => { e.stopPropagation(); onTogglePin?.(entry); }}
                  className="absolute top-1 left-1"
                >
                  <Star className={`w-3 h-3 ${pinned ? "text-amber-400 fill-amber-400" : "text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-zinc-400"}`} />
                </button>
              )}
              <FileThumb entry={entry} size={size} />
              <span className="text-xs text-zinc-300 text-center break-words line-clamp-2 leading-tight w-full">
                {entry.name}
              </span>
            </div>
          );
        })}
        {merged.length === 0 && (
          <div className="col-span-full text-center text-zinc-600 text-xs py-10">This folder is empty or access was denied.</div>
        )}
      </div>
    </div>
  );
}