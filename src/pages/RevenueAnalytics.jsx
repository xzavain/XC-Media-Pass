import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CategoryDonut from "@/components/billing/CategoryDonut";
import { toCsv, downloadFile } from "@/lib/billingApi";

export default function RevenueAnalytics() {
  const [loading, setLoading] = useState(true);
  const [byCategory, setByCategory] = useState([]);
  const [byGateway, setByGateway] = useState([]);
  const [churn, setChurn] = useState({ active: 0, past_due: 0, canceled: 0, total: 0 });
  const [subs, setSubs] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [cats, gws, catAgg, gwAgg, statusAgg] = await Promise.all([
      base44.entities.SubscriptionCategory.list(),
      base44.entities.PaymentGatewayAccount.list(),
      base44.entities.Subscription.aggregate({ groupBy: "category_id", sum: "amount" }),
      base44.entities.Subscription.aggregate({ groupBy: "gateway_account_id", sum: "amount" }),
      base44.entities.Subscription.aggregate({ groupBy: "status" }),
    ]);
    const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
    setByCategory((catAgg.rows || []).map((r) => ({ name: catById[r.category_id]?.name || "Uncategorized", value: r.sum_amount || 0, color: catById[r.category_id]?.color_hex || "#64748b", count: r.count })));
    const gwById = Object.fromEntries(gws.map((g) => [g.id, g]));
    setByGateway((gwAgg.rows || []).map((r) => ({ name: gwById[r.gateway_account_id]?.account_name || "Unknown", provider: gwById[r.gateway_account_id]?.provider, value: r.sum_amount || 0, count: r.count })));
    const statusMap = {};
    (statusAgg.rows || []).forEach((r) => { statusMap[r.status] = r.count; });
    setChurn({ active: statusMap.active || 0, past_due: statusMap.past_due || 0, canceled: statusMap.canceled || 0, total: (statusAgg.rows || []).reduce((s, r) => s + r.count, 0) });
    const page = await base44.entities.Subscription.filter({}, { sort: "-next_billing_date", limit: 1000 });
    setSubs(page.items || page || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const fmt = (n) => (n || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
  const totalRevenue = byCategory.reduce((s, x) => s + x.value, 0);

  const handleExportSubs = () => {
    const rows = subs.map((s) => ({ raw_product_name: s.raw_product_name, amount: s.amount, currency: s.currency, status: s.status, next_billing_date: s.next_billing_date, external_subscription_id: s.external_subscription_id }));
    downloadFile("subscriptions.csv", toCsv(rows, ["raw_product_name", "amount", "currency", "status", "next_billing_date", "external_subscription_id"]));
  };
  const handleExportCalendar = () => {
    const rows = subs.filter((s) => s.next_billing_date).map((s) => ({ next_billing_date: s.next_billing_date, raw_product_name: s.raw_product_name, amount: s.amount, status: s.status }));
    downloadFile("renewal-calendar.csv", toCsv(rows, ["next_billing_date", "raw_product_name", "amount", "status"]));
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2"><BarChart3 className="w-6 h-6 text-cyan-400" /> Revenue Analytics</h1><p className="text-sm text-slate-500 mt-1">Intake forecasting & category distribution</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={handleExportCalendar} className="border-slate-700 text-zinc-300 hover:bg-slate-800"><Download className="w-4 h-4 mr-1" /> Renewal CSV</Button><Button variant="outline" onClick={handleExportSubs} className="border-slate-700 text-zinc-300 hover:bg-slate-800"><Download className="w-4 h-4 mr-1" /> Subscriptions CSV</Button></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Recurring Revenue" value={fmt(totalRevenue)} />
        <MetricCard label="Active" value={churn.active} color="text-emerald-400" />
        <MetricCard label="Past Due" value={churn.past_due} color="text-amber-400" />
        <MetricCard label="Canceled" value={churn.canceled} color="text-rose-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-200 mb-3">Intake by Category</h2>
          {byCategory.length ? <><CategoryDonut data={byCategory} /><div className="space-y-1.5 mt-2">{byCategory.map((c) => <div key={c.name} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-zinc-300"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span><span className="text-zinc-100">{fmt(c.value)} <span className="text-xs text-slate-500">· {c.count}</span></span></div>)}</div></> : <p className="text-sm text-slate-500 py-12 text-center">No data yet</p>}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-200 mb-3">Account Distribution</h2>
          {byGateway.length ? <div className="space-y-3">{byGateway.map((g) => <div key={g.name}><div className="flex items-center justify-between text-sm mb-1"><span className="text-zinc-300">{g.name} <span className="text-xs text-slate-500 capitalize">· {g.provider}</span></span><span className="text-zinc-100">{fmt(g.value)}</span></div><div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${totalRevenue ? (g.value / totalRevenue) * 100 : 0}%` }} /></div></div>)}</div> : <p className="text-sm text-slate-500 py-12 text-center">No data yet</p>}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><p className="text-xs text-slate-500">{label}</p><p className={`text-xl font-semibold mt-1 ${color || "text-zinc-100"}`}>{value}</p></div>;
}