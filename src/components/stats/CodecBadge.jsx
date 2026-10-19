import React from "react";

const CODEC_CONFIG = {
  h264: { label: "H.264", class: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  hevc: { label: "HEVC", class: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  h265: { label: "H.265", class: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  av1: { label: "AV1", class: "bg-lime-500/10 text-lime-400 border-lime-500/20" },
  vp9: { label: "VP9", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  mpeg2: { label: "MPEG-2", class: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  mpeg4: { label: "MPEG-4", class: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  unknown: { label: "Unknown", class: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

export default function CodecBadge({ codec }) {
  const key = (codec || "unknown").toLowerCase();
  const config = CODEC_CONFIG[key] || CODEC_CONFIG.unknown;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${config.class}`}>
      {config.label}
    </span>
  );
}