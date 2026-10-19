import React from "react";

const platformConfig = {
  plex: {
    label: "Plex",
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  jellyfin: {
    label: "Jellyfin",
    gradient: "from-purple-500 to-violet-600",
    bg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  emby: {
    label: "Emby",
    gradient: "from-emerald-500 to-green-600",
    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
};

export default function PlatformBadge({ platform, size = "sm" }) {
  const config = platformConfig[platform];
  if (!config) return null;

  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span className={`inline-flex items-center rounded-md border font-medium ${config.bg} ${sizeClass}`}>
      {config.label}
    </span>
  );
}