import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import TicketStatusBadge from "@/components/tickets/TicketStatusBadge";
import TicketKanbanCard from "@/components/tickets/TicketKanbanCard";

export default function TicketKanbanColumn({ status, tickets, onCardClick }) {
  return (
    <div className="w-[260px] lg:w-auto lg:flex-1 lg:min-w-0 flex flex-col shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <TicketStatusBadge status={status} />
        <span className="text-xs font-medium text-zinc-500 bg-zinc-800/60 rounded-full px-2 py-0.5">{tickets.length}</span>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 space-y-2 p-2 rounded-lg border min-h-[150px] transition-colors ${
              snapshot.isDraggingOver
                ? "bg-lime-500/5 border-lime-500/30"
                : "bg-zinc-900/30 border-zinc-800/40"
            }`}
          >
            {tickets.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-6">No tickets</p>
            ) : (
              tickets.map((t, i) => (
                <TicketKanbanCard key={t.id} ticket={t} index={i} onClick={() => onCardClick(t)} />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}