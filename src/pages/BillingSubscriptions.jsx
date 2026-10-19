import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { ListFilter, Upload, Loader2, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubscriptionTable from "@/components/billing/SubscriptionTable";
import SubscriptionImportModal from "@/components/billing/SubscriptionImportModal";

export default function BillingSubscriptions() {
  const [subs, setSubs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    const [cat, gw, pl, cust] = await Promise.all([
      base44.entities.SubscriptionCategory.list(),
      base44.entities.PaymentGatewayAccount.list(),
      base44.entities.SubscriptionPlan.list(),
      base44.entities.SubscriptionCustomer.list(),
    ]);
    setCategories(cat); setGateways(gw); setPlans(pl); setCustomers(cust);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => { const t = setTimeout(() => setSearch(searchInput), 350); return () => clearTimeout(t); }, [searchInput]);

  const loadSubs = useCallback(async (reset = true) => {
    setLoading(true);
    const query = {};
    if (gatewayFilter !== "all") query.gateway_account_id = gatewayFilter;
    if (categoryFilter !== "all") query.category_id = categoryFilter;
    if (statusFilter !== "all") query.status = statusFilter;
    if (search) query.raw_product_name = { $regex: search, $options: "i" };
    const page = await base44.entities.Subscription.filter(query, { sort: "-next_billing_date", limit: 50, cursor: reset ? undefined : cursor });
    const items = page.items || page;
    setSubs((prev) => reset ? items : [...prev, ...items]);
    setHasMore(page.has_more);
    setCursor(page.next_cursor || null);
    setLoading(false);
  }, [gatewayFilter, categoryFilter, statusFilter, search, cursor]);

  useEffect(() => { loadSubs(true); }, [gatewayFilter, categoryFilter, statusFilter, search]); // eslint-disable-line

  const customersById = Object.fromEntries(customers.map((c) => [c.id, c]));
  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const gatewaysById = Object.fromEntries(gateways.map((g) => [g.id, g]));
  const plansById = Object.fromEntries(plans.map((p) => [p.id, p]));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2"><ListFilter className="w-6 h-6 text-cyan-400" /> Subscriptions & Customers</h1><p className="text-sm text-slate-500 mt-1">All ingested subscriptions across gateways</p></div>
        <Button onClick={() => setShowImport(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white"><Upload className="w-4 h-4 mr-1" /> Import CSV</Button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><Input placeholder="Search product name..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="bg-slate-900 border-slate-700 text-zinc-100 pl-9" /></div>
        <Select value={gatewayFilter} onValueChange={setGatewayFilter}><SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 w-44"><SelectValue placeholder="All Gateways" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-700"><SelectItem value="all">All Gateways</SelectItem>{gateways.map((g) => <SelectItem key={g.id} value={g.id}>{g.account_name}</SelectItem>)}</SelectContent></Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 w-44"><SelectValue placeholder="All Categories" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-700"><SelectItem value="all">All Categories</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 w-36"><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-700"><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="past_due">Past Due</SelectItem><SelectItem value="canceled">Canceled</SelectItem></SelectContent></Select>
      </div>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div> : <>
        <SubscriptionTable subscriptions={subs} customersById={customersById} categoriesById={categoriesById} gatewaysById={gatewaysById} plansById={plansById} />
        {hasMore && <div className="flex justify-center pt-2"><Button variant="outline" onClick={() => loadSubs(false)} className="border-slate-700 text-zinc-300 hover:bg-slate-800">Load more <ChevronDown className="w-4 h-4 ml-1" /></Button></div>}
      </>}
      {showImport && <SubscriptionImportModal open={showImport} onClose={() => { setShowImport(false); loadSubs(true); }} gatewayAccountId={gatewayFilter !== "all" ? gatewayFilter : (gateways[0]?.id || null)} categories={categories} plans={plans} />}
    </div>
  );
}