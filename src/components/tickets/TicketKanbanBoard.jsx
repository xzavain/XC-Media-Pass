import React from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { sendDiscordNotification } from "@/lib/discordWebhook";
import TicketKanbanColumn from "@/components/tickets/TicketKanbanColumn";

const STATUSES = ["open", "pending", "resolved", "closed"];

export default function TicketKanbanBoard({ tickets, onCardClick, onUpdated }) {
  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tickets.filter((t) => t.status === s);
    return acc;
  }, {});

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const ticket = tickets.find((t) => t.id === draggableId);
    await base44.entities.Ticket.update(draggableId, { status: destination.droppableId });
    if (ticket) {
      sendDiscordNotification({ event: "ticket_status_changed", ticket: { ...ticket, status: destination.droppableId } }).catch(() => {});
    }
    onUpdated();
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 lg:gap-4 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
        {STATUSES.map((status) => (
          <TicketKanbanColumn
            key={status}
            status={status}
            tickets={byStatus[status]}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </DragDropContext>
  );
}