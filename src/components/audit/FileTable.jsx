import React, { useState, useEffect, useCallback } from "react";
import { FolderOpen, Star, Info, Loader2 } from "lucide-react";
import { getColumnWidths, saveColumnWidths, isPinned } from "@/lib/fileManagerStorage";
import { formatBytes, formatDate, getFileType, isImageFile, getFileIcon } from "@/lib/fileUtils";
import { mergeEntryInfo } from "@/lib/folderInfoMap";
import FileThumb from "@/components/audit/FileThumb";

function ColHeader({ field, label, sortField, sortDir, onSort, width, onResizeStart }) {
  const active = sortField === field;
  return (
    <th
      style={{ width }}
      className="relative px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider select-none whitespace-nowrap"
    >
      <span onClick={() => onSort(field)} className="cursor-pointer hover:text-zinc-300 flex items-center gap-1">
        {label}
        {active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </span>
      <span
        onMouseDown={(e) => onResizeStart(e, field)}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-violet-500/40"
      />
    </th>
  );
}

// Windows "Details" view — sortable, resizable columns. Folder sizes are
// cumulative (from the folder-info map) and media files show poster thumbnails.
export default function FileTable({ entries, loading, serverUrl, infoMap, metaLoading, onNavigate, onImageClick, onTogglePin, onShowProperties, pinVersion }) {
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [widths, setWidths] = useState(getColumnWidths);
  const resizing = React.useRef(null);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const onResizeStart = (e, field) => {
    resizing.current = { field, startX: e.clientX, startWidth: widths[field] };
    document.body.style.cursor = "col-resize";
  };

  const onMouseMove = useCallback((e) => {
    if (!resizing.current) return;
    const { field, startX, startWidth } = resizing.current;
    const next = Math.max(60, startWidth + (e.clientX - startX));
    setWidths((w) => ({ ...w, [field]: next }));
  }, []);

  const onMouseUp = useCallback(() => {
    if (resizing.current) {
      resizing.current = null;
      document.body.style.cursor = "";
      setWidths((w) => { saveColumnWidths(w); return w; });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const merged = (entries || []).map((e) => mergeEntryInfo(e, infoMap, metaLoading));
  const sorted = [...merged].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    let av = a[sortField] ?? "";
    let bv = b[sortField] ?? "";
    if (sortField === "size") { av = a.size || 0; bv = b.size || 0; }
    if (sortField === "dateModified") { av = a.dateModified ? new Date(a.dateModified).getTime() : 0; bv = b.dateModified ? new Date(b.dateModified).getTime() : 0; }
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Loading…</div>;
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="border-collapse table-fixed" style={{ width: "100%" }}>
        <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800/60 z-10">
          <tr>
            <th style={{ width: widths.poster }} className="px-2 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Poster</th>
            <ColHeader field="name" label="Name" sortField={sortField} sortDir={sortDir} onSort={handleSort} width={widths.name} onResizeStart={onResizeStart} />
            <ColHeader field="type" label="Type" sortField={sortField} sortDir={sortDir} onSort={handleSort} width={widths.type} onResizeStart={onResizeStart} />
            <ColHeader field="size" label="Size" sortField={sortField} sortDir={sortDir} onSort={handleSort} width={widths.size} onResizeStart={onResizeStart} />
            <ColHeader field="dateModified" label="Date Modified" sortField={sortField} sortDir={sortDir} onSort={handleSort} width={widths.dateModified} onResizeStart={onResizeStart} />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/30">
          {sorted.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-600 text-xs">This folder is empty or access was denied.</td></tr>
          )}
          {sorted.map((entry, i) => {
            const FileIcon = entry.isDirectory ? null : getFileIcon(entry.name);
            const pinned = entry.isDirectory && isPinned(serverUrl, entry.path);
            const isImg = !entry.isDirectory && isImageFile(entry.name);
            return (
              <tr
                key={i}
                onClick={() => {
                  if (entry.isDirectory) onNavigate(entry.path, entry.name);
                  else if (isImg) onImageClick(entry);
                }}
                className={`transition-colors group select-none ${entry.isDirectory || isImg ? "cursor-pointer hover:bg-zinc-800/40" : "hover:bg-zinc-800/20"}`}
              >
                <td className="px-2 py-1.5">
                  <div className="flex items-center justify-center">
                    <FileThumb entry={entry} size={32} height={48} className="ring-1 ring-zinc-700/40" />
                  </div>
                </td>
                <td className="px-4 py-1.5 truncate">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {entry.isDirectory && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onTogglePin(entry); }}
                        className="flex-shrink-0"
                      >
                        <Star className={`w-3.5 h-3.5 ${pinned ? "text-amber-400 fill-amber-400" : "text-zinc-700 hover:text-zinc-400"}`} />
                      </button>
                    )}
                    {entry.isDirectory ? (
                      <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0 group-hover:text-amber-300" />
                    ) : (
                      <FileIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    )}
                    <span className={`truncate ${entry.isDirectory ? "text-zinc-200 font-medium" : "text-zinc-400"}`}>{entry.name}</span>
                    {!entry.isDirectory && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onShowProperties?.(entry); }}
                        className="ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-zinc-700"
                        title="Properties"
                      >
                        <Info className="w-3.5 h-3.5 text-zinc-500 hover:text-violet-400" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-1.5 text-xs text-zinc-500 truncate">{getFileType(entry.name, entry.isDirectory)}</td>
                <td className="px-4 py-1.5 text-xs text-zinc-500 tabular-nums truncate">
                  {entry.scanning ? <Loader2 className="w-3 h-3 animate-spin text-zinc-600" /> : entry.size ? formatBytes(entry.size) : "—"}
                </td>
                <td className="px-4 py-1.5 text-xs text-zinc-500 truncate">
                  {entry.scanning && !entry.dateModified ? <Loader2 className="w-3 h-3 animate-spin text-zinc-600" /> : formatDate(entry.dateModified)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}