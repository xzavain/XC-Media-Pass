import React from "react";
import { X, Image as ImageIcon } from "lucide-react";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "—";
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default function ImageLightbox({ file, onClose }) {
  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-200 truncate">{file.name}</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 bg-zinc-950/40">
          <ImageIcon className="w-16 h-16 text-zinc-700" />
          <p className="text-xs text-zinc-500 text-center max-w-xs">
            Live image preview isn't available for arbitrary filesystem paths — the server's API only serves
            content for scanned library items, not raw file browsing. Showing file details instead.
          </p>
        </div>
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>Size: <span className="text-zinc-300">{formatBytes(file.size)}</span></span>
          <span>Modified: <span className="text-zinc-300">{file.dateModified ? new Date(file.dateModified).toLocaleString() : "—"}</span></span>
        </div>
      </div>
    </div>
  );
}