import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link2, X, Search, Ticket as TicketIcon, Loader2 } from "lucide-react";
import TicketStatusBadge from "@/components/tickets/TicketStatusBadge";
import PlatformBadge from "@/components/shared/PlatformBadge";

export default function TicketLinker({ task, user, onActivity }) {
  const [linkedTickets, setLinkedTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadLinked = async () => {
    const ids = task?.linked_ticket_ids || [];
    if (ids.length === 0) { setLinkedTickets([]); return; }
    const tickets = await base44.entities.Ticket.list();
    setLinkedTickets(tickets.filter((t) => ids.includes(t.id)));
  };

  useEffect(() => { loadLinked(); }, [task?.linked_ticket_ids]);

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q.trim() || q.trim().length < 2) { setResults([]); setShowResults(false); return; }
    setLoading(true);
    const tickets = await base44.entities.Ticket.list();
    const lower = q.toLowerCase();
    setResults(tickets.filter((t) =>
      t.subject?.toLowerCase().includes(lower) && !(task.linked_ticket_ids || []).includes(t.id)
    ).slice(0, 8));
    setShowResults(true);
    setLoading(false);
  };

  const handleLink = async (ticket) => {
    const newIds = [...(task.linked_ticket_ids || []), ticket.id];
    await base44.entities.ProjectTask.update(task.id, { linked_ticket_ids: newIds });
    await base44.entities.TaskActivity.create({
      task_id: task.id,
      type: "ticket_linked",
      content: `Linked ticket: ${ticket.subject}`,
      actor_name: user?.full_name,
      actor_email: user?.email,
    });
    onActivity?.({ linked_ticket_ids: newIds });
    setLinkedTickets((prev) => [...prev, ticket]);
    setSearch("");
    setShowResults(false);
  };

  const handleUnlink = async (ticket) => {
    const newIds = (task.linked_ticket_ids || []).filter((id) => id !== ticket.id);
    await base44.entities.ProjectTask.update(task.id, { linked_ticket_ids: newIds });
    await base44.entities.TaskActivity.create({
      task_id: task.id,
      type: "ticket_unlinked",
      content: `Unlinked ticket: ${ticket.subject}`,
      actor_name: user?.full_name,
      actor_email: user?.email,
    });
    onActivity?.({ linked_ticket_ids: newIds });
    setLinkedTickets((prev) => prev.filter((t) => t.id !== ticket.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
        <Link2 className="w-4 h-4 text-zinc-400" />
        Linked Support Tickets
      </div>
      <div className="space-y-1.5">
        {linkedTickets.length === 0 && !showResults && (
          <p className="text-xs text-zinc-600">No tickets linked. Search below to cross-reference a support ticket.</p>
        )}
        {linkedTickets.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-2.5 py-1.5 group">
            <TicketIcon className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-200 truncate">{t.subject}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <TicketStatusBadge status={t.status} />
                {t.service && <PlatformBadge platform={t.service} />}
              </div>
            </div>
            <button onClick={() => handleUnlink(t)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => search.length >= 2 && setShowResults(true)}
            placeholder="Search tickets to link…"
            className="pl-8 bg-zinc-800 border-zinc-700 text-zinc-100 text-sm h-8"
          />
          {loading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-zinc-500" />}
        </div>
        {showResults && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl max-h-56 overflow-y-auto">
            {results.map((t) => (
              <button
                key={t.id}
                onClick={() => handleLink(t)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-700/60 border-b border-zinc-700/50 last:border-0"
              >
                <p className="text-xs text-zinc-200 truncate">{t.subject}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <TicketStatusBadge status={t.status} />
                  <span className="text-xs text-zinc-500">{t.customer_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}