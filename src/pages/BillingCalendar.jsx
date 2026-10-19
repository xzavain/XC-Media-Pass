import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RevenueIntakeBar from "@/components/billing/RevenueIntakeBar";
import BillingCalendarGrid from "@/components/billing/BillingCalendarGrid";
import DateDetailDrawer from "@/components/billing/DateDetailDrawer";

export default function BillingCalendar() {
  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [subs, setSubs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [cats, gws] = await Promise.all([base44.entities.SubscriptionCategory.list(), base44.entities.PaymentGatewayAccount.list()]);
    setCategories(cats); setGateways(gws);
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    const query = { next_billing_date: { $gte: start.toISOString(), $lt: end.toISOString() } };
    if (gatewayFilter !== "all") query.gateway_account_id = gatewayFilter;
    if (categoryFilter !== "all") query.category_id = categoryFilter;
    if (statusFilter !== "all") query.status = statusFilter;
    const page = await base44.entities.Subscription.filter(query, { sort: "next_billing_date", limit: 500 });
    setSubs(page.items || page || []);
    setLoading(false);
  }, [monthDate, gatewayFilter, categoryFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const gatewaysById = Object.fromEntries(gateways.map((g) => [g.id, g]));
  const fmt = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  const now = new Date();
  const todaySubs = subs.filter((s) => { const d = new Date(s.next_billing_date); return d.toDateString() === now.toDateString(); });
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const weekSubs = subs.filter((s) => { const d = new Date(s.next_billing_date); return d >= weekStart && d < weekEnd; });
  const monthlyTotal = subs.reduce((s, x) => s + (x.amount || 0), 0);
  const dailyTotal = todaySubs.reduce((s, x) => s + (x.amount || 0), 0);
  const weeklyTotal = weekSubs.reduce((s, x) => s + (x.amount || 0), 0);
  const successful = subs.filter((s) => s.status === "active" || s.status === "trialing").reduce((s, x) => s + (x.amount || 0), 0);
  const realization = monthlyTotal > 0 ? Math.round((successful / monthlyTotal) * 100) : null;

  const handleDateClick = (day) => { setSelectedDate(day); setDrawerOpen(true); };
  const drawerSubs = selectedDate ? subs.filter((s) => { const d = new Date(s.next_billing_date); return d.toDateString() === selectedDate.toDateString(); }) : [];
  const shiftMonth = (delta) => setMonthDate((d) => { const n = new Date(d); n.setMonth(n.getMonth() + delta); return n; });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2"><CalendarDays className="w-6 h-6 text-cyan-400" /> Billing Calendar</h1><p className="text-sm text-slate-500 mt-1">Upcoming renewals & projected revenue intake</p></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} className="border-slate-700 text-zinc-300 hover:bg-slate-800"><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium text-zinc-200 w-36 text-center">{monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} className="border-slate-700 text-zinc-300 hover:bg-slate-800"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <RevenueIntakeBar daily={fmt(dailyTotal)} weekly={fmt(weeklyTotal)} monthly={fmt(monthlyTotal)} realizationRate={realization} />

      <div className="flex flex-wrap gap-2">
        <Select value={gatewayFilter} onValueChange={setGatewayFilter}><SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 w-44"><SelectValue placeholder="All Gateways" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-700"><SelectItem value="all">All Gateways</SelectItem>{gateways.map((g) => <SelectItem key={g.id} value={g.id}>{g.account_name}</SelectItem>)}</SelectContent></Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 w-44"><SelectValue placeholder="All Categories" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-700"><SelectItem value="all">All Categories</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 w-36"><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-700"><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="past_due">Past Due</SelectItem></SelectContent></Select>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div> : <BillingCalendarGrid monthDate={monthDate} subscriptions={subs} categoriesById={categoriesById} onDateClick={handleDateClick} selectedDate={selectedDate} />}

      <DateDetailDrawer date={selectedDate} subscriptions={drawerSubs} categoriesById={categoriesById} gatewaysById={gatewaysById} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}