import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function PlanModal({ plan, categories, open, onClose }) {
  const { toast } = useToast();
  const [catId, setCatId] = useState("");
  const [pname, setPname] = useState("");
  const [ident, setIdent] = useState("");
  const [amount, setAmount] = useState(0);
  const [interval, setIntervalV] = useState("monthly");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plan) { setCatId(plan.category_id || ""); setPname(plan.plan_name || ""); setIdent(plan.normalized_identifier || ""); setAmount(plan.default_amount || 0); setIntervalV(plan.billing_interval || "monthly"); }
    else { setCatId(categories[0]?.id || ""); setPname(""); setIdent(""); setAmount(0); setIntervalV("monthly"); }
  }, [plan]);

  const handleSave = async () => {
    if (!pname) { toast({ title: "Plan name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const data = { category_id: catId || null, plan_name: pname, normalized_identifier: ident, default_amount: Number(amount) || 0, billing_interval: interval };
      if (plan) await base44.entities.SubscriptionPlan.update(plan.id, data);
      else await base44.entities.SubscriptionPlan.create(data);
      toast({ title: "Plan saved" }); onClose();
    } catch (err) { toast({ title: "Save failed", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-800 text-zinc-100 max-w-lg">
        <DialogHeader><DialogTitle>{plan ? "Edit Plan" : "Add Plan"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-zinc-300 text-sm">Category</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-zinc-300 text-sm">Plan Name</Label><Input value={pname} onChange={(e) => setPname(e.target.value)} className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" /></div>
          <div><Label className="text-zinc-300 text-sm">Normalized Identifier (match token)</Label><Input value={ident} onChange={(e) => setIdent(e.target.value)} placeholder="XC P HD" className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-zinc-300 text-sm">Default Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" /></div>
            <div><Label className="text-zinc-300 text-sm">Billing Interval</Label>
              <Select value={interval} onValueChange={setIntervalV}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="semi_annual">Semi-Annual</SelectItem><SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-zinc-300 hover:bg-slate-800">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white">{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}