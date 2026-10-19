// All billing math derives from BillingExpense records — no hardcoded rates or costs.

export function getPlan(customer, plans) {
  return plans.find((p) => p.id === customer.plan_id) || null;
}

export function getProcessorFee(customer, expenses) {
  const feeExp = expenses.find(
    (e) => e.expense_type === "processor_fee" && e.payment_method === customer.payment_method
  );
  if (!feeExp) return 0;
  return customer.billed_price * ((feeExp.fee_percent || 0) / 100) + (feeExp.fee_fixed || 0);
}

function scopeMatchesPlan(scope, plan) {
  if (!plan) return false;
  if (scope === "All") return true;
  if (scope === "All XC") return plan.server !== "Live TV";
  return scope === plan.server;
}

export function getActiveCustomersInScope(customers, plans, scope) {
  return customers.filter(
    (c) => c.status === "ACTIVE" && scopeMatchesPlan(scope, getPlan(c, plans))
  );
}

export function computeCustomerBilling(customer, customers, plans, expenses) {
  const plan = getPlan(customer, plans);
  const processorFee = getProcessorFee(customer, expenses);
  const netRevenue = customer.billed_price - processorFee;

  let allocatedCost = 0;
  expenses
    .filter((e) => e.expense_type !== "processor_fee")
    .forEach((e) => {
      if (!scopeMatchesPlan(e.scope, plan)) return;
      if (e.expense_type === "live_tv_credit_cost") {
        allocatedCost += (e.monthly_cost || 0) * (plan?.live_tv_credits || 0);
        return;
      }
      const scopeUserCount = getActiveCustomersInScope(customers, plans, e.scope).length;
      if (scopeUserCount === 0) return;
      allocatedCost += (e.monthly_cost || 0) / scopeUserCount;
    });

  const finalProfit = netRevenue - allocatedCost;

  return { plan, processorFee, netRevenue, allocatedCost, finalProfit };
}

// Builds a 6-month trend using each customer's bill_date to bucket revenue by month.
// Server/overhead costs are computed from the current Expenses table and applied
// against each month's active-customer set (expenses have no historical records).
export function computeMonthlyTrends(customers, plans, expenses, monthsBack = 6) {
  const months = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("default", { month: "short", year: "2-digit" }) });
  }

  return months.map(({ key, label }) => {
    const monthCustomers = customers.filter((c) => {
      if (!c.bill_date) return false;
      const d = new Date(c.bill_date);
      return `${d.getFullYear()}-${d.getMonth()}` === key && c.status === "ACTIVE";
    });

    const totals = monthCustomers.reduce(
      (acc, c) => {
        const r = computeCustomerBilling(c, customers, plans, expenses);
        acc.revenue += c.billed_price;
        acc.expenses += r.allocatedCost + r.processorFee;
        acc.profit += r.finalProfit;
        return acc;
      },
      { revenue: 0, expenses: 0, profit: 0 }
    );

    return { month: label, ...totals };
  });
}

export function computeDashboardStats(customers, plans, expenses) {
  const active = customers.filter((c) => c.status === "ACTIVE");
  const totals = active.reduce(
    (acc, c) => {
      const r = computeCustomerBilling(c, customers, plans, expenses);
      acc.totalRevenue += c.billed_price;
      acc.totalFees += r.processorFee;
      acc.totalNet += r.netRevenue;
      acc.totalCost += r.allocatedCost;
      acc.totalProfit += r.finalProfit;
      return acc;
    },
    { totalRevenue: 0, totalFees: 0, totalNet: 0, totalCost: 0, totalProfit: 0 }
  );
  return { activeUsers: active.length, ...totals };
}