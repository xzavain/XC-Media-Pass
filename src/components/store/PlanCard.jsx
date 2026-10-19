import React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlanCard({ plan }) {
  return (
    <div className="flex flex-col border border-zinc-800 rounded-xl bg-zinc-900/60 backdrop-blur-sm p-6">
      <h3 className="font-heading text-lg font-semibold text-white">{plan.name}</h3>
      {plan.description && <p className="text-sm text-zinc-300 mt-1">{plan.description}</p>}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">${plan.price}</span>
        <span className="text-sm text-zinc-400">/{plan.billing_interval === "yearly" ? "yr" : "mo"}</span>
      </div>
      {plan.features?.length > 0 && (
        <ul className="mt-4 space-y-2 flex-1">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-200">
              <Check className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      )}
      <Button asChild className="mt-6 w-full">
        <Link to={`/checkout/${plan.checkout_token}`}>Subscribe</Link>
      </Button>
    </div>
  );
}