import React from "react";

const PLATFORMS = {
  plex: { color: "#E5A00D", label: "Plex" },
  emby: { color: "#52B54B", label: "Emby" },
  jellyfin: { color: "#AA5EC3", label: "Jellyfin" },
};

// Small, legible brand logo mark for a media server platform.
// Brand-colored rounded badge with a white initial; scales with its container.
export default function PlatformLogo({ platform, className = "" }) {
  const cfg = PLATFORMS[platform];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex flex-shrink-0 ${className}`}
      title={cfg.label}
      aria-label={cfg.label}
    >
      <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
        <rect width="24" height="24" rx="5" fill={cfg.color} />
        <text
          x="12"
          y="17"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill="#ffffff"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {cfg.label[0]}
        </text>
      </svg>
    </span>
  );
}