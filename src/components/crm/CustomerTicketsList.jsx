import React from "react";
import { Link } from "react-router-dom";
import { Ticket } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  open: "bg-blue-500/10 text-blue-400",
  pending: "bg-amber-500/10 text-amber-400",
  resolved: "bg-lime-500/10 text-lime-400",
  closed: "bg-zinc-700 text-zinc-400",
};

export default function CustomerTicketsList({ tickets }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Ticket className="w-4 h-4 text-lime-400" />
        <h3 className="text-sm font-semibold text-white">Support Tickets ({tickets.length})</h3>
      </div>
      {tickets.length === 0 ? (
        <p className="text-xs text-zinc-500">No tickets found.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tickets.map((t) => (
            <Link
              key={t.id}
              to="/support"
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-800/60 hover:bg-zinc-800/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{t.subject}</p>
                <p className="text-[10px] text-zinc-500">{format(new Date(t.created_date), "MMM d, yyyy")}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[t.status] || "bg-zinc-700 text-zinc-400"}`}>
                {t.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}