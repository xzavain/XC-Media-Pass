import React from "react";
import { Loader2 } from "lucide-react";
import FileThumb from "@/components/audit/FileThumb";
import { mergeEntryInfo } from "@/lib/folderInfoMap";
import { formatBytes, formatDate, getFileType, isImageFile } from "@/lib/fileUtils";

// Windows "Content" view — a medium icon on the left with name and metadata
// columns (type, size, date) laid out to the right of each row.
export default function FileContentView({ entries, infoMap, metaLoading, serverUrl, onNavigate, onImageClick, onShowProperties }) {
  const merged = (entries || [])
    .map((e) => mergeEntryInfo(e, infoMap, metaLoading))
    .sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1));

  const handleClick = (entry) => {
    if (entry.isDirectory) onNavigate?.(entry.path, entry.name);
    else if (isImageFile(entry.name)) onImageClick?.(entry);
    else onShowProperties?.(entry);
  };

  return (
    <div className="flex-1 overflow-auto">
      {merged.map((entry, i) => (
        <div
          key={i}
          onClick={() => handleClick(entry)}
          className={`flex items-center gap-3 px-4 py-2 border-b border-zinc-800/30 transition-colors ${entry.isDirectory || isImageFile(entry.name) ? "cursor-pointer hover:bg-zinc-800/40" : "hover:bg-zinc-800/20"}`}
        >
          <FileThumb entry={entry} size={40} />
          <div className="flex-1 min-w-0 text-sm text-zinc-200 truncate">{entry.name}</div>
          <div className="w-28 text-xs text-zinc-500 truncate hidden sm:block">{getFileType(entry.name, entry.isDirectory)}</div>
          <div className="w-24 text-xs text-zinc-500 tabular-nums text-right">
            {entry.scanning ? <Loader2 className="w-3 h-3 animate-spin text-zinc-600" /> : entry.size ? formatBytes(entry.size) : "—"}
          </div>
          <div className="w-40 text-xs text-zinc-500 truncate hidden md:block">
            {entry.scanning && !entry.dateModified ? <Loader2 className="w-3 h-3 animate-spin text-zinc-600" /> : formatDate(entry.dateModified)}
          </div>
        </div>
      ))}
      {merged.length === 0 && (
        <div className="text-center text-zinc-600 text-xs py-10">This folder is empty or access was denied.</div>
      )}
    </div>
  );
}