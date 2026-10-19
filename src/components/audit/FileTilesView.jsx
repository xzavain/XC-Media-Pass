import React from "react";
import { Loader2 } from "lucide-react";
import FileThumb from "@/components/audit/FileThumb";
import { mergeEntryInfo } from "@/lib/folderInfoMap";
import { formatBytes, formatDate, getFileType, isImageFile } from "@/lib/fileUtils";

// Windows "Tiles" view — a medium thumbnail with name, type, size and date.
export default function FileTilesView({ entries, infoMap, metaLoading, serverUrl, onNavigate, onImageClick, onShowProperties }) {
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
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {merged.map((entry, i) => (
          <div
            key={i}
            onClick={() => handleClick(entry)}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-zinc-800/40 transition-colors"
          >
            <FileThumb entry={entry} size={56} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200 truncate">{entry.name}</p>
              <p className="text-xs text-zinc-500 truncate">{getFileType(entry.name, entry.isDirectory)}</p>
              <p className="text-xs text-zinc-600 truncate">
                {entry.scanning ? <Loader2 className="w-3 h-3 animate-spin text-zinc-600 inline" /> : (entry.size ? formatBytes(entry.size) : "—")} · {entry.scanning && !entry.dateModified ? "…" : formatDate(entry.dateModified)}
              </p>
            </div>
          </div>
        ))}
        {merged.length === 0 && (
          <div className="col-span-full text-center text-zinc-600 text-xs py-10">This folder is empty or access was denied.</div>
        )}
      </div>
    </div>
  );
}