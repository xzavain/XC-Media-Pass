import React, { useMemo } from "react";
import { Apple, Tv, Monitor, Smartphone, Gamepad2, Cast, Box } from "lucide-react";
import { classifyDevice } from "@/lib/performanceSync";

const PLATFORMS = [
  { key: "apple_tv", label: "Apple TV", icon: Apple, color: "#a3e635" },
  { key: "roku", label: "Roku", icon: Tv, color: "#fbbf24" },
  { key: "web", label: "Windows / Web", icon: Monitor, color: "#38bdf8" },
  { key: "android_tv", label: "Android TV", icon: Cast, color: "#f472b6" },
  { key: "steam_deck", label: "Steam Deck", icon: Gamepad2, color: "#34d399" },
  { key: "ios", label: "iOS / Android", icon: Smartphone, color: "#c084fc" },
  { key: "other", label: "Other", icon: Box, color: "#52525b" },
];

// Visual breakdown of which client apps/platforms are most active, derived
// from device telemetry records.
export default function ClientDistributionGrid({ devices }) {
  const counts = useMemo(() => {
    const c = {};
    PLATFORMS.forEach((p) => (c[p.key] = 0));
    for (const d of devices) {
      const k = classifyDevice(d.device, d.player, d.client_app);
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [devices]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {PLATFORMS.map((p) => {
        const count = counts[p.key] || 0;
        const pct = Math.round((count / total) * 100);
        const Icon = p.icon;
        return (
          <div key={p.key} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-5 h-5" style={{ color: p.color }} />
              <span className="text-sm font-medium text-zinc-200">{p.label}</span>
            </div>
            <div className="text-2xl font-bold text-zinc-100">{count}</div>
            <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
            </div>
            <div className="text-xs text-zinc-500 mt-1">{pct}% of devices</div>
          </div>
        );
      })}
    </div>
  );
}