import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const statusColors = {
  ACTIVE: "bg-lime-500/10 text-lime-400",
  INACTIVE: "bg-zinc-700 text-zinc-400",
  CANCELED: "bg-red-500/10 text-red-400",
};

export default function CustomerListItem({ customer, planName }) {
  return (
    <Link
      to={`/crm/${customer.id}`}
      className="flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-800/50 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">{customer.user_name}</p>
        <p className="text-xs text-zinc-500 truncate">{customer.email}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-zinc-400 hidden sm:block">{planName || "No plan"}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[customer.status] || "bg-zinc-700 text-zinc-400"}`}>
          {customer.status}
        </span>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
      </div>
    </Link>
  );
}