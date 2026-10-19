import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PlanCard from "@/components/store/PlanCard";

export default function Store() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.StorePlan.filter({ visibility: "public", is_active: true }, "-created_date").then((data) => {
      setPlans(data);
      setLoading(false);
    });
  }, []);

  const grouped = plans.reduce((acc, plan) => {
    const cat = plan.category || "Other";
    acc[cat] = acc[cat] || [];
    acc[cat].push(plan);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-white">Store</h1>
        <p className="text-sm text-zinc-300 mt-1">Browse plans and manage your subscription</p>
      </div>

      {loading ? (
        <p className="text-zinc-300">Loading plans...</p>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl text-zinc-300">
          No plans available right now. Check back soon.
        </div>
      ) : (
        Object.entries(grouped).map(([category, categoryPlans]) => (
          <div key={category} className="mb-10">
            <h2 className="font-heading text-lg font-semibold text-white mb-4">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {categoryPlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}