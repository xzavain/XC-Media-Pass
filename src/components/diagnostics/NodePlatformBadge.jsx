import React from "react";

const badgeConfig = {
  plex: { label: "Plex", bg: "bg-[#E5A00D]", text: "text-zinc-950", glow: "shadow-[0_0_10px_rgba(229,160,13,0.35)]" },
  emby: { label: "Emby", bg: "bg-[#52B54B]", text: "text-zinc-950", glow: "shadow-[0_0_10px_rgba(82,181,75,0.35)]" },
  jellyfin: { label: "Jellyfin", bg: "bg-[#AA5CC3]", text: "text-white", glow: "shadow-[0_0_10px_rgba(170,92,195,0.35)]" },
  downloader_sabnzbd: { label: "SABnzbd", bg: "bg-[#FFB300]", text: "text-zinc-950", glow: "shadow-[0_0_10px_rgba(255,179,0,0.35)]" },
  downloader_qbittorrent: { label: "qBittorrent", bg: "bg-[#1E6FB0]", text: "text-white", glow: "shadow-[0_0_10px_rgba(30,111,176,0.35)]" },
  backend_api: { label: "API", bg: "bg-indigo-600", text: "text-white", glow: "shadow-[0_0_10px_rgba(99,102,241,0.35)]" },
};

export const serviceTypeLabel = (t) => badgeConfig[t]?.label || t;

export default function NodePlatformBadge({ serviceType, name, size = "md" }) {
  const config = badgeConfig[serviceType];
  if (!config) return null;
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";
  return (
    <span
      className={`inline-flex items-center rounded-md font-bold ${config.bg} ${config.text} ${config.glow} ${sizeClass}`}
    >
      {name || config.label}
    </span>
  );
}