import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { Clock, User } from "lucide-react";
import moment from "moment";

const PRIORITY_COLORS = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-zinc-600",
};

export default function TicketKanbanCard({ ticket, index, onClick }) {
  return (
    <Draggable draggableId={ticket.id} index={index}>
      {(provided, snapshot) => (
        <button
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`w-full text-left p-3 rounded-lg border border-zinc-800/60 bg-zinc-900/60 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all space-y-2 border-l-2 ${PRIORITY_COLORS[ticket.priority] || "border-l-zinc-600"} ${
            snapshot.isDragging ? "ring-1 ring-lime-500/40 shadow-lg" : ""
          }`}
        >
          <p className="text-sm font-medium text-zinc-100 leading-snug line-clamp-2">{ticket.subject}</p>
          <p className="text-xs text-zinc-500 truncate">{ticket.customer_name || ticket.customer_email}</p>
          <div className="flex items-center justify-between gap-2">
            <PlatformBadge platform={ticket.service} />
            <span className="text-[10px] text-zinc-600 flex items-center gap-1 shrink-0">
              <Clock className="w-2.5 h-2.5" />
              {moment(ticket.created_date).fromNow()}
            </span>
          </div>
          {ticket.assigned_to_name && (
            <div className="flex items-center gap-1 text-[10px] text-lime-400/80 pt-1 border-t border-zinc-800/40">
              <User className="w-2.5 h-2.5" />
              {ticket.assigned_to_name}
            </div>
          )}
        </button>
      )}
    </Draggable>
  );
}