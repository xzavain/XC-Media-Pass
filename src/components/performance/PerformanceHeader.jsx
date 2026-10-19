import React from "react";
import { Link, useLocation } from "react-router-dom";
import { RefreshCw, Activity, Monitor, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";

const TABS = [
  { to: "/performance", label: "Overview", icon: Activity },
  { to: "/performance/devices", label: "Devices", icon: Monitor },
  { to: "/performance/bandwidth", label: "Bandwidth", icon: Wifi },
];

// Shared header for all Performance pages: title, last-sync stamp, manual
// refresh trigger, and sub-page navigation tabs.
export default function PerformanceHeader({ refreshing, onRefresh, lastSync }) {
  const { pathname } = useLocation();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100">Performance & Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {lastSync ? `Last sync ${moment(lastSync).fromNow()}` : "No sync yet — press refresh to capture"}
          </p>
        </div>
        <Button
          onClick={onRefresh}
          disabled={refreshing}
          className="bg-lime-600 hover:bg-lime-700 text-white gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Syncing…" : "Refresh Analytics"}
        </Button>
      </div>
      <div className="flex gap-1 border-b border-zinc-800">
        {TABS.map((t) => {
          const active = pathname === t.to;
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? "border-lime-500 text-lime-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}