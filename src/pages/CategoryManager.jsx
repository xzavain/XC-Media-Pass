import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Tags, Plus, Pencil, Trash2, Sparkles, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import CategoryModal from "@/components/billing/CategoryModal";
import PlanModal from "@/components/billing/PlanModal";

const SEED = [
  { name: "XC Foxtrot", slug: "xc-foxtrot", color_hex: "#3B82F6", match_tokens: ["Foxtrot", "XC P"] },
  { name: "XC Echo", slug: "xc-echo", color_hex: "#10B981", match_tokens: ["Echo"] },
  { name: "Live TV", slug: "live-tv", color_hex: "#F59E0B", match_tokens: ["Live TV", "Stream", "IPTV"] },
  { name: "Uncategorized", slug: "uncategorized", color_hex: "#64748B", match_tokens: [] },
];

export default function CategoryManager() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState([]);
  const [unclassified, setUnclassified] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCat, setShowCat] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [showPlan, setShowPlan] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [overrideCat, setOverrideCat] = useState({});
  const [overridePlan, setOverridePlan] = useState({});

  const load = useCallback(async () => {
    const [cats, plns, subs] = await Promise.all([
      base44.entities.SubscriptionCategory.list(),
      base44.entities.SubscriptionPlan.list(),
      base44.entities.Subscription.filter({ category_id: { $exists: false } }, { limit: 200 }),
    ]);
    setCategories(cats); setPlans(plns);
    setUnclassified(subs.items || subs || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    await base44.entities.SubscriptionCategory.bulkCreate(SEED);
    toast({ title: "Core categories seeded" }); load();
  };
  const handleDeleteCat = async (id) => { await base44.entities.SubscriptionCategory.delete(id); load(); };
  const handleDeletePlan = async (id) => { await base44.entities.SubscriptionPlan.delete(id); load(); };

  const handleApplyOverride = async () => {
    const updates = [];
    for (const s of unclassified) {
      const cat = overrideCat[s.id]; const plan = overridePlan[s.id];
      if (cat || plan) updates.push({ id: s.id, category_id: cat || null, plan_id: plan || null });
    }
    if (!updates.length) { toast({ title: "Select a category for at least one row" }); return; }
    await base44.entities.Subscription.bulkUpdate(updates);
    toast({ title: `${updates.length} subscriptions reclassified` }); setOverrideCat({}); setOverridePlan({}); load();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2"><Tags className="w-6 h-6 text-cyan-400" /> Categories & Plans</h1><p className="text-sm text-slate-500 mt-1">Configure product groups, plan tiers, and auto-matching rules</p></div>
        <div className="flex gap-2">
          {!categories.length && <Button onClick={handleSeed} variant="outline" className="border-slate-700 text-zinc-300 hover:bg-slate-800"><Sparkles className="w-4 h-4 mr-1" /> Seed Core Categories</Button>}
          <Button onClick={() => { setEditCat(null); setShowCat(true); }} className="bg-cyan-600 hover:bg-cyan-700 text-white"><Plus className="w-4 h-4 mr-1" /> Category</Button>
          <Button onClick={() => { setEditPlan(null); setShowPlan(true); }} variant="outline" className="border-slate-700 text-zinc-300 hover:bg-slate-800"><Plus className="w-4 h-4 mr-1" /> Plan</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: c.color_hex }} /><h3 className="text-sm font-semibold text-zinc-100">{c.name}</h3></div>
              <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => { setEditCat(c); setShowCat(true); }}><Pencil className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => handleDeleteCat(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div>
            </div>
            {(c.match_tokens || []).length > 0 && <div className="flex flex-wrap gap-1 mt-2">{c.match_tokens.map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">{t}</span>)}</div>}
            <div className="mt-3 space-y-1.5">
              {plans.filter((p) => p.category_id === c.id).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm bg-slate-900/40 rounded-lg px-3 py-2">
                  <div><span className="text-zinc-200">{p.plan_name}</span><span className="text-xs text-slate-500 ml-2">{p.normalized_identifier}</span></div>
                  <div className="flex items-center gap-2"><span className="text-xs text-slate-400">${p.default_amount || 0} · {p.billing_interval}</span><Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => { setEditPlan(p); setShowPlan(true); }}><Pencil className="w-3 h-3" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDeletePlan(p.id)}><Trash2 className="w-3 h-3" /></Button></div>
                </div>
              ))}
              {!plans.some((p) => p.category_id === c.id) && <p className="text-xs text-slate-600 pl-1">No plans</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2"><Wand2 className="w-4 h-4 text-cyan-400" /> Manual Override ({unclassified.length})</h2>{unclassified.length > 0 && <Button size="sm" onClick={handleApplyOverride} className="bg-cyan-600 hover:bg-cyan-700 text-white">Apply Selected</Button>}</div>
        {unclassified.length === 0 ? <p className="text-sm text-slate-500">All subscriptions are classified.</p> : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {unclassified.map((s) => (
              <div key={s.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-slate-900/40 rounded-lg p-2.5">
                <div className="sm:col-span-2 text-sm text-zinc-200 truncate">{s.raw_product_name}</div>
                <Select value={overrideCat[s.id] || ""} onValueChange={(v) => setOverrideCat((p) => ({ ...p, [s.id]: v }))}><SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-700">{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                <Select value={overridePlan[s.id] || ""} onValueChange={(v) => setOverridePlan((p) => ({ ...p, [s.id]: v }))}><SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 h-8 text-xs"><SelectValue placeholder="Plan" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-700">{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.plan_name}</SelectItem>)}</SelectContent></Select>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCat && <CategoryModal category={editCat} open={showCat} onClose={() => { setShowCat(false); load(); }} />}
      {showPlan && <PlanModal plan={editPlan} categories={categories} open={showPlan} onClose={() => { setShowPlan(false); load(); }} />}
    </div>
  );
}