import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { PieChart as PieIcon, Loader2 } from "lucide-react";
import { formatBytes } from "@/lib/formatBytes";
import PlatformLogo from "@/components/shared/PlatformLogo";

const PALETTE = ["#a3e635", "#22d3ee", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#f43f5e", "#3b82f6", "#eab308", "#06b6d4"];

// Dedupe libraries by id, keeping the entry with the largest totalSize.
function dedupeLibs(libs) {
  const map = new Map();
  for (const lib of libs) {
    const key = String(lib.id);
    const prev = map.get(key);
    if (!prev || (lib.totalSize || 0) > (prev.totalSize || 0)) map.set(key, lib);
  }
  return [...map.values()];
}

// Renders a per-server bar chart for each server's libraries plus a global
// storage-share donut with a clear legend (name, size, percentage).
export default function LibraryStorageCharts({ servers, results }) {
  const { perServer, pieData, total } = useMemo(() => {
    const perServer = [];
    const flat = [];
    for (const srv of servers) {
      const r = results[srv.id];
      if (!r || !r.libraries) continue;
      const libs = dedupeLibs(r.libraries)
        .filter((l) => (l.totalSize || 0) > 0)
        .sort((a, b) => (b.totalSize || 0) - (a.totalSize || 0));
      if (libs.length === 0) continue;
      const bars = libs.map((l, i) => ({
        name: l.name,
        size: l.totalSize || 0,
        items: l.itemCount || 0,
        color: PALETTE[i % PALETTE.length],
      }));
      const serverTotal = bars.reduce((s, b) => s + b.size, 0);
      perServer.push({ server: srv, bars, serverTotal });
      for (const b of bars) flat.push({ label: `${srv.name} — ${b.name}`, size: b.size, color: b.color });
    }
    flat.sort((a, b) => b.size - a.size);
    const total = flat.reduce((s, f) => s + f.size, 0);
    const topPie = flat.slice(0, 8);
    const otherSize = flat.slice(8).reduce((s, f) => s + f.size, 0);
    const pieData = topPie.map((f) => ({ name: f.label, value: f.size, color: f.color }));
    if (otherSize > 0) pieData.push({ name: "Other", value: otherSize, color: "#52525b" });
    return { perServer, pieData, total };
  }, [servers, results]);

  const anyLoading = servers.some((srv) => results[srv.id]?.loading);
  if (perServer.length === 0 && pieData.length === 0) {
    if (!anyLoading) return null;
    return (
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-10 flex items-center justify-center gap-2 text-zinc-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
        Calculating library storage…
      </div>
    );
  }

  const tooltipStyle = { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12, color: "#fff" };

  return (
    <div className="space-y-4">
      {/* Global storage share with legend */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <PieIcon className="w-4 h-4 text-lime-400" />
          <h3 className="text-sm font-semibold text-white">Storage Share by Library</h3>
          <span className="ml-auto text-xs text-zinc-500">{formatBytes(total)} total</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} stroke="none">
                {pieData.map((p, i) => (
                  <Cell key={i} fill={p.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatBytes(v), "Size"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {pieData.map((p, i) => {
              const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0.0";
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
                  <span className="text-white truncate flex-1">{p.name}</span>
                  <span className="text-zinc-400 tabular-nums">{formatBytes(p.value)}</span>
                  <span className="text-zinc-500 tabular-nums w-12 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Per-server top libraries */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {perServer.map(({ server, bars, serverTotal }) => (
          <div key={server.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <PlatformLogo platform={server.platform} className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-white">{server.name}</h3>
              <span className="ml-auto text-xs text-zinc-500">{formatBytes(serverTotal)}</span>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(160, bars.length * 34)}>
              <BarChart data={bars} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <XAxis type="number" tickFormatter={(v) => formatBytes(v)} stroke="#52525b" fontSize={11} tick={{ fill: "#fff" }} />
                <YAxis type="category" dataKey="name" width={140} stroke="#52525b" fontSize={10} tick={{ fill: "#fff" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatBytes(v), "Size"]} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="size" radius={[0, 4, 4, 0]}>
                  {bars.map((b, i) => (
                    <Cell key={i} fill={b.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}