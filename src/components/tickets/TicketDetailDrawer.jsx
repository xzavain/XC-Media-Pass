import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import TicketDetailPanel from "@/components/tickets/TicketDetailPanel";

export default function TicketDetailDrawer({ ticket, open, onOpenChange, user, isStaff, staffList = [], onUpdated }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-slate-950 border-slate-800 text-slate-100 w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-slate-100 pr-8">{ticket?.subject || "Ticket"}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <TicketDetailPanel ticket={ticket} user={user} isStaff={isStaff} staffList={staffList} onUpdated={onUpdated} />
        </div>
      </SheetContent>
    </Sheet>
  );
}