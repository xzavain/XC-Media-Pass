import React from "react";

const config = {
  open: { label: "Open", cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  pending: { label: "Awaiting Staff", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  in_progress: { label: "In Progress", cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  waiting_on_customer: { label: "Customer Reply", cls: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  resolved: { label: "Resolved", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  closed: { label: "Closed", cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

const priorityConfig = {
  urgent: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  high: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  medium: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  normal: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function TicketStatusBadge({ status, priority }) {
  const c = config[status] || config.open;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-md border font-medium ${c.cls}`}>
        {c.label}
      </span>
      {priority && priorityConfig[priority] && (
        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-md border font-medium capitalize ${priorityConfig[priority]}`}>
          {priority}
        </span>
      )}
    </div>
  );
}

export { config as statusConfig, priorityConfig };