import React, { useState } from "react";
import { ArrowUpCircle, ArrowDownCircle, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function PortalPlanSwitcher({ customer, plans, currentPlan, onUpdated }) {
  const [switching, setSwitching] = useState(null);
  const { toast } = useToast();

  const handleSwitch = async (newPlan) => {
    setSwitching(newPlan.id);
    try {
      await base44.entities.BillingCustomer.update(customer.id, {
        plan_id: newPlan.id,
        billed_price: newPlan.price,
        billing_cycle: newPlan.billing_interval || "monthly",
      });
      toast({ title: "Plan updated", description: `You are now on ${newPlan.name}` });
      onUpdated?.();
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSwitching(null);
    }
  };

  const availablePlans = plans.filter((p) => p.visibility !== "hidden" && p.is_active !== false);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-200 mb-4">Change Plan</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {availablePlans.map((p) => {
          const isCurrent = p.id === customer.plan_id;
          const isUpgrade = (p.price || 0) > (currentPlan?.price || 0);
          const isDowngrade = (p.price || 0) < (currentPlan?.price || 0);
          return (
            <div key={p.id} className={`rounded-lg border p-3 ${isCurrent ? "border-lime-500/40 bg-lime-500/5" : "border-zinc-800 bg-zinc-950/30"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-zinc-100">{p.name}</p>
                {isCurrent ? (
                  <span className="text-xs text-lime-400 flex items-center gap-1"><Check className="w-3 h-3" /> Current</span>
                ) : isUpgrade ? (
                  <ArrowUpCircle className="w-4 h-4 text-lime-400" />
                ) : isDowngrade ? (
                  <ArrowDownCircle className="w-4 h-4 text-amber-400" />
                ) : null}
              </div>
              <p className="text-lg font-bold text-zinc-100">${p.price}<span className="text-xs font-normal text-zinc-500">/{p.billing_interval || "mo"}</span></p>
              {p.features?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {p.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-lime-400" /> {f}
                    </li>
                  ))}
                </ul>
              )}
              <Button
                size="sm"
                className={`w-full mt-3 h-8 text-xs ${isCurrent ? "bg-zinc-800 text-zinc-500" : "bg-lime-600 hover:bg-lime-700 text-white"}`}
                disabled={isCurrent || switching === p.id}
                onClick={() => handleSwitch(p)}
              >
                {switching === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : isCurrent ? "Current Plan" : isUpgrade ? "Upgrade" : "Switch"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}