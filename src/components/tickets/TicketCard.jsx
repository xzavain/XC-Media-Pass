import React from "react";
import TicketStatusBadge from "@/components/tickets/TicketStatusBadge";
import PlatformBadge from "@/components/shared/PlatformBadge";
import moment from "moment";

export default function TicketCard({ ticket, onClick, showCustomer = false }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-4 px-4 py-3 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-800/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {ticket.ticket_number && <span className="text-[10px] font-mono text-slate-500">{ticket.ticket_number}</span>}
          <p className="text-sm font-medium text-zinc-100 truncate">{ticket.subject}</p>
        </div>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {showCustomer ? `${ticket.customer_name || ticket.customer_email} · ` : ""}
          {ticket.server_name ? `${ticket.server_name} · ` : ""}{moment(ticket.created_date).fromNow()}
        </p>
      </div>
      {ticket.service && <PlatformBadge platform={ticket.service} />}
      <TicketStatusBadge status={ticket.status} priority={ticket.priority} />
    </button>
  );
}