import React from "react";
import { FileText, Film, Image as ImageIcon } from "lucide-react";

function typeIcon(type) {
  if (type === "image" || type === "gif") return ImageIcon;
  if (type === "video") return Film;
  return FileText;
}

export default function AssetGrid({ assets, onSelect }) {
  if (assets.length === 0) {
    return <p className="text-sm text-zinc-600 text-center py-8">No files yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {assets.map((asset) => {
        const Icon = typeIcon(asset.file_type);
        return (
          <button
            key={asset.id}
            onClick={() => onSelect?.(asset)}
            className="flex flex-col rounded-lg border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-800/50 overflow-hidden text-left transition-colors"
          >
            <div className="h-24 flex items-center justify-center bg-zinc-950/60">
              {asset.file_type === "image" || asset.file_type === "gif" ? (
                <img src={asset.file_url} alt={asset.file_name} className="w-full h-full object-cover" />
              ) : (
                <Icon className="w-8 h-8 text-zinc-600" />
              )}
            </div>
            <div className="p-2">
              <p className="text-xs text-zinc-300 truncate">{asset.file_name}</p>
              <p className="text-[10px] text-zinc-600">{asset.category}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}