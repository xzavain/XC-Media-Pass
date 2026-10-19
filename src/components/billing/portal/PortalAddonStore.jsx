import React, { useState } from "react";
import { Plus, Check, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function PortalAddonStore({ customer, addons, onUpdated }) {
  const [toggling, setToggling] = useState(null);
  const { toast } = useToast();

  const activeIds = customer.addon_product_ids || [];
  const available = addons.filter((a) => a.visibility !== "hidden" && a.is_active !== false).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const toggleAddon = async (addon) => {
    setToggling(addon.id);
    const has = activeIds.includes(addon.id);
    const newIds = has ? activeIds.filter((id) => id !== addon.id) : [...activeIds, addon.id];
    try {
      await base44.entities.BillingCustomer.update(customer.id, { addon_product_ids: newIds });
      toast({ title: has ? "Add-on removed" : "Add-on added", description: addon.name });
      onUpdated?.();
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-4">
        <ShoppingCart className="w-4 h-4 text-lime-400" /> Add-on Products
      </h3>
      {available.length === 0 ? (
        <p className="text-sm text-zinc-500 py-6 text-center">No add-on products available</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {available.map((a) => {
            const has = activeIds.includes(a.id);
            return (
              <div key={a.id} className={`rounded-lg border p-3 ${has ? "border-lime-500/40 bg-lime-500/5" : "border-zinc-800 bg-zinc-950/30"}`}>
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium text-zinc-100">{a.name}</p>
                  {a.category && <span className="text-xs text-zinc-500">{a.category}</span>}
                </div>
                <p className="text-xs text-zinc-400 mb-2">{a.description}</p>
                <p className="text-sm font-bold text-zinc-100">${a.price}<span className="text-xs font-normal text-zinc-500">/{a.billing_cycle === "one_time" ? "one-time" : a.billing_cycle}</span></p>
                {a.features?.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {a.features.slice(0, 2).map((f, i) => (
                      <li key={i} className="text-xs text-zinc-500 flex items-center gap-1"><Check className="w-3 h-3 text-lime-400" /> {f}</li>
                    ))}
                  </ul>
                )}
                <Button
                  size="sm"
                  className={`w-full mt-3 h-8 text-xs ${has ? "bg-zinc-800 text-zinc-300 hover:bg-red-600 hover:text-white" : "bg-lime-600 hover:bg-lime-700 text-white"}`}
                  disabled={toggling === a.id}
                  onClick={() => toggleAddon(a)}
                >
                  {toggling === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : has ? <><Check className="w-3 h-3" /> Remove</> : <><Plus className="w-3 h-3" /> Add</>}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}