import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { computeDashboardStats } from "@/lib/billingCalculations";
import BillingStatCard from "@/components/billing/BillingStatCard";
import CustomerTable from "@/components/billing/CustomerTable";
import PlanTable from "@/components/billing/PlanTable";
import ExpenseTable from "@/components/billing/ExpenseTable";
import CustomerForm from "@/components/billing/CustomerForm";
import ExpenseForm from "@/components/billing/ExpenseForm";
import EditCustomerModal from "@/components/billing/EditCustomerModal";
import CustomerImportExport from "@/components/billing/CustomerImportExport";
import AddonProductManager from "@/components/billing/AddonProductManager";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DollarSign, Receipt, TrendingUp, Wallet, PiggyBank, Database, Mail, Megaphone, ArrowRight } from "lucide-react";

export default function BillingDashboard() {
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const loadAll = useCallback(async () => {
    const [c, p, e, a] = await Promise.all([
      base44.entities.BillingCustomer.list("-created_date", 500),
      base44.entities.StorePlan.list(),
      base44.entities.BillingExpense.list(),
      base44.entities.AddonProduct.list(),
    ]);
    setCustomers(c);
    setPlans(p);
    setExpenses(e);
    setAddons(a);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return <div className="p-8 text-sm text-zinc-500">Loading billing data...</div>;
  }

  const stats = computeDashboardStats(customers, plans, expenses);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">Billing Engine</h1>
        <p className="text-sm text-zinc-500 mt-1">Dynamic subscription financials — all costs pull from the Expenses table</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <BillingStatCard label="Active Users" value={stats.activeUsers} icon={Users} />
        <BillingStatCard label="Monthly Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} icon={DollarSign} />
        <BillingStatCard label="Processor Fees" value={`$${stats.totalFees.toFixed(2)}`} icon={Receipt} />
        <BillingStatCard label="Net Revenue" value={`$${stats.totalNet.toFixed(2)}`} icon={Wallet} />
        <BillingStatCard label="Operating Costs" value={`$${stats.totalCost.toFixed(2)}`} icon={TrendingUp} />
        <BillingStatCard label="Net Profit" value={`$${stats.totalProfit.toFixed(2)}`} icon={PiggyBank} tone={stats.totalProfit >= 0 ? "positive" : "negative"} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/billing/migration" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-sm text-zinc-200 hover:border-lime-500/30 hover:text-lime-400 transition-colors">
          <Database className="w-4 h-4" /> Migration Pipeline <ArrowRight className="w-3 h-3" />
        </Link>
        <Link to="/billing/templates" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-sm text-zinc-200 hover:border-lime-500/30 hover:text-lime-400 transition-colors">
          <Mail className="w-4 h-4" /> Email Templates <ArrowRight className="w-3 h-3" />
        </Link>
        <Link to="/billing/communications" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-sm text-zinc-200 hover:border-lime-500/30 hover:text-lime-400 transition-colors">
          <Megaphone className="w-4 h-4" /> Communications <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <Tabs defaultValue="customers">
        <TabsList className="bg-zinc-900/60 border border-zinc-800/60">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4 mt-4">
          <CustomerForm plans={plans} onCreated={loadAll} />
          <CustomerImportExport customers={customers} plans={plans} onImported={loadAll} />
          <CustomerTable customers={customers} plans={plans} expenses={expenses} onEdit={setEditingCustomer} />
        </TabsContent>

        <TabsContent value="plans" className="space-y-4 mt-4">
          <PlanTable plans={plans} />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 mt-4">
          <ExpenseForm onCreated={loadAll} />
          <ExpenseTable expenses={expenses} customers={customers} plans={plans} />
        </TabsContent>

        <TabsContent value="addons" className="space-y-4 mt-4">
          <AddonProductManager addons={addons} onChanged={loadAll} />
        </TabsContent>
      </Tabs>

      <EditCustomerModal
        customer={editingCustomer}
        plans={plans}
        open={!!editingCustomer}
        onOpenChange={(v) => !v && setEditingCustomer(null)}
        onSaved={loadAll}
      />
    </div>
  );
}