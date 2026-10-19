import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, User, AlertCircle, CreditCard } from "lucide-react";
import PortalPlanCard from "@/components/billing/portal/PortalPlanCard";
import PortalPlanSwitcher from "@/components/billing/portal/PortalPlanSwitcher";
import PortalAddonStore from "@/components/billing/portal/PortalAddonStore";
import PortalPaymentHistory from "@/components/billing/portal/PortalPaymentHistory";

export default function CustomerPortal() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [plan, setPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [addons, setAddons] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user?.email) return;
    const [customers, allPlans, allAddons, allPayments] = await Promise.all([
      base44.entities.BillingCustomer.filter({ email: user.email }),
      base44.entities.StorePlan.list(),
      base44.entities.AddonProduct.list(),
      base44.entities.PaymentHistory.filter({ customer_email: user.email }, "-payment_date", 100),
    ]);
    const cust = customers[0] || null;
    setCustomer(cust);
    setPlans(allPlans);
    setAddons(allAddons);
    setPayments(allPayments);
    if (cust?.plan_id) {
      const p = allPlans.find((p) => p.id === cust.plan_id);
      setPlan(p || null);
    } else {
      setPlan(null);
    }
    setLoading(false);
  }, [user?.email]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-lime-400" /></div>;
  }

  if (!customer) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h2 className="text-zinc-200 font-medium">No subscription found</h2>
          <p className="text-sm text-zinc-500 mt-1">There's no billing profile linked to your account yet. Browse the store to subscribe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
          <User className="w-6 h-6 text-lime-400" /> My Account
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your subscription, add-ons, and billing</p>
      </div>

      <PortalPlanCard customer={customer} plan={plan} addons={addons} />
      <PortalPlanSwitcher customer={customer} plans={plans} currentPlan={plan} onUpdated={loadAll} />
      <PortalAddonStore customer={customer} addons={addons} onUpdated={loadAll} />
      <PortalPaymentHistory payments={payments} />
    </div>
  );
}