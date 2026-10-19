import React, { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import moment from "moment";

const MAX_POINTS = 20;

export default function SessionActivityChart({ sessions }) {
  const [history, setHistory] = useState([]);
  const lastCountRef = useRef(null);

  useEffect(() => {
    if (lastCountRef.current === sessions.length) return;
    lastCountRef.current = sessions.length;
    setHistory((prev) => [...prev, { time: moment().format("HH:mm:ss"), count: sessions.length }].slice(-MAX_POINTS));
  }, [sessions.length]);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
      <div className="px-5 py-4 border-b border-zinc-800/60">
        <h2 className="text-sm font-semibold text-zinc-200">Real-Time Session Activity</h2>
      </div>
      <div className="p-4">
        {history.length < 2 ? (
          <div className="h-[260px] flex items-center justify-center text-zinc-500 text-sm">Gathering live session data...</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="time" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#e4e4e7" }}
              />
              <Line type="monotone" dataKey="count" name="Active Streams" stroke="#60a5fa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}