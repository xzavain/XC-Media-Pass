import React, { useState, useEffect } from "react";
import { FolderOpen } from "lucide-react";
import { getFileIcon } from "@/lib/fileUtils";

// Renders a media poster when artwork is available, otherwise a file-type
// or folder icon. Supports a separate height for 2:3 poster-style thumbnails.
export default function FileThumb({ entry, size = 48, height, rounded = "rounded-md", className = "" }) {
  const [imgError, setImgError] = useState(false);
  const artwork = entry.artwork;

  // Reset the error state whenever a new artwork URL arrives so a later
  // successful lookup isn't stuck showing the fallback icon.
  useEffect(() => { setImgError(false); }, [artwork]);

  const h = height || size;

  if (artwork && !imgError) {
    return (
      <div
        className={`${rounded} overflow-hidden bg-zinc-800 flex-shrink-0 ${className}`}
        style={{ width: size, height: h }}
      >
        <img
          src={artwork}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const Icon = entry.isDirectory ? FolderOpen : getFileIcon(entry.name);
  const iconSize = Math.max(14, Math.round(Math.min(size, h) * 0.5));
  return (
    <div
      className={`${rounded} flex items-center justify-center flex-shrink-0 bg-zinc-800/40 ${className}`}
      style={{ width: size, height: h }}
    >
      <Icon className="text-zinc-500" style={{ width: iconSize, height: iconSize }} />
    </div>
  );
}