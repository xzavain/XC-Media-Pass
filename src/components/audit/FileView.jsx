import React from "react";
import FileTable from "@/components/audit/FileTable";
import FileIconGrid from "@/components/audit/FileIconGrid";
import FileTilesView from "@/components/audit/FileTilesView";
import FileContentView from "@/components/audit/FileContentView";
import FileThumb from "@/components/audit/FileThumb";
import { mergeEntryInfo } from "@/lib/folderInfoMap";
import { isImageFile } from "@/lib/fileUtils";

// Windows "List" view — a compact multi-column flow of names with tiny icons.
function FileListView({ entries, infoMap, metaLoading, onNavigate, onImageClick, onShowProperties }) {
  const merged = (entries || [])
    .map((e) => mergeEntryInfo(e, infoMap, metaLoading))
    .sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1));

  const handleClick = (entry) => {
    if (entry.isDirectory) onNavigate?.(entry.path, entry.name);
    else if (isImageFile(entry.name)) onImageClick?.(entry);
    else onShowProperties?.(entry);
  };

  return (
    <div className="flex-1 overflow-auto p-2">
      <div className="flex flex-wrap content-start gap-x-6 gap-y-0">
        {merged.map((entry, i) => (
          <div
            key={i}
            onClick={() => handleClick(entry)}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-zinc-800/40 cursor-pointer w-48"
          >
            <FileThumb entry={entry} size={20} rounded="rounded-sm" />
            <span className="text-sm text-zinc-300 truncate">{entry.name}</span>
          </div>
        ))}
        {merged.length === 0 && (
          <div className="w-full text-center text-zinc-600 text-xs py-10">This folder is empty or access was denied.</div>
        )}
      </div>
    </div>
  );
}

// Dispatches to the correct Windows 11-style view layout based on viewMode.
export default function FileView({ viewMode, entries, infoMap, metaLoading, serverUrl, onNavigate, onImageClick, onTogglePin, onShowProperties }) {
  const props = { entries, infoMap, metaLoading, serverUrl, onNavigate, onImageClick, onTogglePin, onShowProperties };

  switch (viewMode) {
    case "list":
      return <FileListView {...props} />;
    case "small_icons":
      return <FileIconGrid {...props} size={48} />;
    case "medium_icons":
      return <FileIconGrid {...props} size={80} />;
    case "large_icons":
      return <FileIconGrid {...props} size={140} />;
    case "tiles":
      return <FileTilesView {...props} />;
    case "content":
      return <FileContentView {...props} />;
    default:
      return <FileTable {...props} />;
  }
}