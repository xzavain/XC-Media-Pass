import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import PlanFormInline from "@/components/store/PlanFormInline";
import { useToast } from "@/components/ui/use-toast";

export default function StorePlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const loadPlans = async () => {
    setLoading(true);
    const data = await base44.entities.StorePlan.list("-created_date");
    setPlans(data);
    setLoading(false);
  };

  useEffect(() => { loadPlans(); }, []);

  if (user && user.role === "customer") {
    return <div className="p-8 text-white">You do not have access to this page.</div>;
  }

  const handleSave = async (payload) => {
    if (editingPlan) {
      await base44.entities.StorePlan.update(editingPlan.id, payload);
    } else {
      const token = crypto.randomUUID().replace(/-/g, "");
      await base44.entities.StorePlan.create({ ...payload, checkout_token: token });
    }
    setShowForm(false);
    setEditingPlan(null);
    loadPlans();
  };

  const handleDelete = async (plan) => {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    await base44.entities.StorePlan.delete(plan.id);
    loadPlans();
  };

  const copyLink = (plan) => {
    const url = `${window.location.origin}/checkout/${plan.checkout_token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Checkout link copied", description: url });
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Store Plans</h1>
          <p className="text-sm text-zinc-300 mt-1">Manage subscription plans shown in the customer storefront</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setEditingPlan(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> New Plan
          </Button>
        )}
      </div>

      {showForm ? (
        <PlanFormInline
          plan={editingPlan}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingPlan(null); }}
        />
      ) : loading ? (
        <p className="text-zinc-300">Loading plans...</p>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl text-zinc-300">
          No plans yet. Create your first plan to populate the storefront.
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-zinc-300">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Visibility</th>
                <th className="text-left px-4 py-3">Active</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-t border-zinc-800 text-white">
                  <td className="px-4 py-3 font-medium">{plan.name}</td>
                  <td className="px-4 py-3 text-zinc-300">{plan.category}</td>
                  <td className="px-4 py-3">${plan.price}/{plan.billing_interval === "yearly" ? "yr" : "mo"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${
                      plan.visibility === "public"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-300 border-zinc-500/20"
                    }`}>
                      {plan.visibility === "public" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {plan.visibility === "public" ? "Public" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{plan.is_active ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => copyLink(plan)} title="Copy checkout link">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingPlan(plan); setShowForm(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(plan)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}