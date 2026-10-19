import React from "react";

const statusConfig = {
  pending: {
    label: "Pending",
    classes: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    dot: "bg-zinc-400",
  },
  active: {
    label: "Active",
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  expired: {
    label: "Expired",
    classes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  revoked: {
    label: "Revoked",
    classes: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    dot: "bg-rose-400",
  },
  connected: {
    label: "Connected",
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  disconnected: {
    label: "Disconnected",
    classes: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    dot: "bg-zinc-400",
  },
  error: {
    label: "Error",
    classes: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    dot: "bg-rose-400",
  },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border text-xs font-medium px-2 py-0.5 ${config.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}