import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TicketForm from "@/components/tickets/TicketForm";
import TicketCard from "@/components/tickets/TicketCard";
import TicketDetailDrawer from "@/components/tickets/TicketDetailDrawer";
import { Plus, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const TABS = [
  { id: "active", label: "Active Tickets", statuses: ["open", "pending", "in_progress", "waiting_on_customer"] },
  { id: "awaiting", label: "Awaiting Your Reply", statuses: ["waiting_on_customer"] },
  { id: "resolved", label: "Resolved / History", statuses: ["resolved", "closed"] },
];

export default function CustomerTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const loadTickets = useCallback(async () => {
    if (!user) return;
    const list = await base44.entities.Ticket.filter({ customer_id: user.id }, "-created_date");
    setTickets(list);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const activeTab = TABS.find((t) => t.id === tab);
  const filtered = tickets.filter((t) => activeTab.statuses.includes(t.status));

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100">My Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">View your ticket history and submit new requests</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="w-4 h-4" /> {showForm ? "Close" : "New Ticket"}
        </Button>
      </div>

      {showForm && (
        <TicketForm user={user} onCreated={() => { setShowForm(false); loadTickets(); }} />
      )}

      <div className="flex gap-2 flex-wrap border-b border-slate-800 pb-3">
        {TABS.map((t) => {
          const count = tickets.filter((tk) => t.statuses.includes(tk.status)).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                tab === t.id ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "text-slate-400 border border-transparent hover:bg-slate-800/50"
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-500"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500 text-center py-8">Loading tickets...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <TicketIcon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No tickets in this category.</p>
          </div>
        ) : (
          filtered.map((t) => (
            <TicketCard key={t.id} ticket={t} onClick={() => setSelected(t)} />
          ))
        )}
      </div>

      <TicketDetailDrawer
        ticket={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        user={user}
        isStaff={false}
        onUpdated={loadTickets}
      />
    </div>
  );
}