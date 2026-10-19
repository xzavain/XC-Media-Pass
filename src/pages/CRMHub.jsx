import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";
import CustomerListItem from "@/components/crm/CustomerListItem";

export default function CRMHub() {
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.BillingCustomer.list("-bill_date"),
      base44.entities.StorePlan.list(),
    ]).then(([customerList, planList]) => {
      setCustomers(customerList);
      setPlans(planList);
      setLoading(false);
    });
  }, []);

  const planNameMap = plans.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});

  const filtered = customers.filter(
    (c) =>
      c.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-white">CRM Hub</h1>
        <p className="text-sm text-zinc-400">Unified view of every customer's billing, tickets, and activity.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-zinc-900/40 border-zinc-800"
        />
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Users className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
          <p className="text-sm">No customers found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CustomerListItem key={c.id} customer={c} planName={planNameMap[c.plan_id]} />
          ))}
        </div>
      )}
    </div>
  );
}