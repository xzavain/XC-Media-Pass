import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TicketCard from "@/components/tickets/TicketCard";
import TicketDetailPanel from "@/components/tickets/TicketDetailPanel";
import CustomerContextSidebar from "@/components/tickets/CustomerContextSidebar";
import TicketForm from "@/components/tickets/TicketForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Inbox, AlertTriangle, Clock, UserCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import moment from "moment";

const QUICK_FILTERS = [
  { id: "all", label: "All Tickets", icon: Inbox, filter: () => true },
  { id: "unassigned", label: "Unassigned", icon: Sparkles, filter: (t) => !t.assigned_to_email },
  { id: "presales", label: "Pre-Sales Leads", icon: UserCheck, filter: (t) => t.department === "pre_sales" || t.department === "support" },
  { id: "urgent", label: "Urgent SLAs", icon: AlertTriangle, filter: (t) => t.priority === "urgent" || (t.sla_due_at && moment(t.sla_due_at).isBefore(moment().add(4, "hours"))) },
  { id: "mine", label: "My Assigned", icon: Clock, filter: (t) => t.assigned_to_email === "" },
];

export default function AdminTickets() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "staff";
  const [tickets, setTickets] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadTickets = useCallback(async () => {
    const list = await base44.entities.Ticket.list("-created_date", 200);
    setTickets(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isStaff) { setLoading(false); return; }
    loadTickets();
    base44.entities.User.list().then((users) =>
      setStaffList(users.filter((u) => u.role === "admin" || u.role === "staff"))
    );
  }, [isStaff, loadTickets]);

  if (!isStaff) {
    return <div className="flex-1 flex items-center justify-center h-full text-slate-500 text-sm">Only staff and admins can access the support dashboard.</div>;
  }

  const activeFilter = QUICK_FILTERS.find((f) => f.id === quickFilter) || QUICK_FILTERS[0];
  const filtered = tickets.filter(activeFilter.filter);

  return (
    <div className="p-4 lg:p-6 w-full h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100">Support Desk</h1>
          <p className="text-sm text-slate-500 mt-1">Triage queue, agent tools, and customer context</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/discord-settings">
            <Button variant="outline" className="border-slate-700 text-slate-300 gap-2">
              <Settings className="w-4 h-4" /> Discord
            </Button>
          </Link>
          <Button onClick={() => setShowForm((v) => !v)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Plus className="w-4 h-4" /> {showForm ? "Close" : "New Ticket"}
          </Button>
        </div>
      </div>

      {showForm && (
        <TicketForm user={user} isStaff onCreated={() => { setShowForm(false); loadTickets(); }} />
      )}

      {/* Quick filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_FILTERS.map((f) => {
          const Icon = f.icon;
          const count = tickets.filter(f.filter).length;
          return (
            <button
              key={f.id}
              onClick={() => setQuickFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                quickFilter === f.id ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "text-slate-400 border-slate-800 hover:bg-slate-800/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${quickFilter === f.id ? "bg-indigo-500/20" : "bg-slate-800"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Split-pane: List + Detail + Sidebar */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: List */}
        <div className="w-2/5 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading tickets...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No tickets found.</p>
          ) : (
            filtered.map((t) => (
              <TicketCard key={t.id} ticket={t} onClick={() => setSelected(t)} showCustomer />
            ))
          )}
        </div>

        {/* Right: Detail + Sidebar */}
        <div className="flex-1 flex gap-4 min-w-0">
          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            {selected ? (
              <TicketDetailPanel
                ticket={selected}
                user={user}
                isStaff
                staffList={staffList}
                onUpdated={() => { loadTickets(); setSelected((prev) => prev ? { ...prev } : prev); }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Inbox className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Select a ticket to view details</p>
                </div>
              </div>
            )}
          </div>

          {/* Customer context sidebar */}
          {selected && (
            <div className="w-72 overflow-y-auto flex-shrink-0">
              <CustomerContextSidebar ticket={selected} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}