import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function PlanTable({ plans }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 overflow-x-auto">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/60">
        <p className="text-xs text-zinc-500">Plans are managed on the Store Plans page (single source of truth)</p>
        <Button asChild size="sm" variant="outline" className="border-zinc-700 gap-1.5">
          <Link to="/store-plans"><ExternalLink className="w-3.5 h-3.5" /> Manage Plans</Link>
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/60 text-xs text-zinc-500 uppercase">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold">Plan</th>
            <th className="text-left px-4 py-2.5 font-semibold">Category</th>
            <th className="text-left px-4 py-2.5 font-semibold">Server</th>
            <th className="text-left px-4 py-2.5 font-semibold">Price</th>
            <th className="text-left px-4 py-2.5 font-semibold">Live TV Credits</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/40">
          {plans.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-600 text-xs">No plans yet.</td></tr>
          ) : (
            plans.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5 text-zinc-200">{p.name}</td>
                <td className="px-4 py-2.5 text-zinc-400">{p.category}</td>
                <td className="px-4 py-2.5 text-zinc-400">{p.server}</td>
                <td className="px-4 py-2.5 text-zinc-300">${p.price.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-zinc-400">{p.live_tv_credits || 0}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}