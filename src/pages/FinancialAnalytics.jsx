import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { computeMonthlyTrends } from "@/lib/billingCalculations";
import FinancialTrendChart from "@/components/billing/FinancialTrendChart";

export default function FinancialAnalytics() {
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [c, p, e] = await Promise.all([
      base44.entities.BillingCustomer.list("-created_date", 500),
      base44.entities.StorePlan.list(),
      base44.entities.BillingExpense.list(),
    ]);
    setCustomers(c);
    setPlans(p);
    setExpenses(e);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return <div className="p-8 text-sm text-zinc-500">Loading financial analytics...</div>;
  }

  const trends = computeMonthlyTrends(customers, plans, expenses);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">Financial Analytics</h1>
        <p className="text-sm text-zinc-500 mt-1">Monthly revenue, expense, and net profit trends from your billing data</p>
      </div>

      <FinancialTrendChart data={trends} />
    </div>
  );
}