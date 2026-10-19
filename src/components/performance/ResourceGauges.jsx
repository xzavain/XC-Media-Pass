import React from "react";
import { Cpu, MemoryStick, Network } from "lucide-react";

// Radial gauge for a single utilization metric (0-100%).
function Gauge({ icon: Icon, label, value, unit = "%", color }) {
  const v = Math.min(100, Math.max(0, value || 0));
  const circ = 2 * Math.PI * 34;
  const offset = circ - (v / 100) * circ;
  return (
    <div className="flex flex-col items-center bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#27272a" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-4 h-4 mb-0.5" style={{ color }} />
          <span className="text-lg font-bold text-zinc-100">{Math.round(v)}{unit}</span>
        </div>
      </div>
      <span className="text-xs text-zinc-400 mt-2">{label}</span>
    </div>
  );
}

// Real-time server resource utilization gauges (CPU, RAM, Network I/O).
export default function ResourceGauges({ snapshot }) {
  const net = snapshot?.network_io_kbps || 0;
  // Normalize network throughput to a 0-100 gauge (50 Mbps = 50000 kbps ≈ 100%)
  const netPct = Math.min(100, (net / 50000) * 100);
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Server Resource Utilization</h3>
      <div className="grid grid-cols-3 gap-3">
        <Gauge icon={Cpu} label="CPU" value={snapshot?.cpu_percent} color="#a3e635" />
        <Gauge icon={MemoryStick} label="RAM" value={snapshot?.ram_percent} color="#38bdf8" />
        <Gauge icon={Network} label="Net I/O" value={netPct} unit="%" color="#fbbf24" />
      </div>
      <p className="text-xs text-zinc-600 mt-3 text-center">
        Network: {net.toLocaleString()} kbps · CPU/RAM estimated from stream load
      </p>
    </div>
  );
}