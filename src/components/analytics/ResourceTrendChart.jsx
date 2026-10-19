import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PlatformBadge from "@/components/shared/PlatformBadge";
import moment from "moment";

export default function ResourceTrendChart({ server, metrics }) {
  const data = metrics
    .filter((m) => m.server_id === server.id)
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    .map((m) => ({
      time: moment(m.created_date).format("HH:mm"),
      cpu: m.cpu_percent,
      ram: m.ram_percent,
    }));

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <PlatformBadge platform={server.platform} />
        <h3 className="text-sm font-semibold text-zinc-300">{server.name}</h3>
      </div>
      {data.length < 2 ? (
        <p className="text-sm text-zinc-500 py-10 text-center">Not enough data yet — check back after some usage history builds up</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <XAxis dataKey="time" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} domain={[0, 100]} unit="%" />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} />
            <Line type="monotone" dataKey="cpu" name="CPU" stroke="#a3e635" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ram" name="RAM" stroke="#60a5fa" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}