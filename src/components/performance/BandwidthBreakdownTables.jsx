import React, { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import moment from "moment";

function formatBandwidth(kb) {
  if (!kb) return "0 MB";
  if (kb < 1024) return `${Math.round(kb)} KB`;
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1024 / 1024).toFixed(2)} GB`;
}

// Two sortable tables: total data transferred grouped by user account and by
// individual media asset, from persisted BandwidthBreakdown records.
export default function BandwidthBreakdownTables({ breakdowns }) {
  const users = useMemo(() => breakdowns.filter((b) => b.dimension === "user"), [breakdowns]);
  const media = useMemo(() => breakdowns.filter((b) => b.dimension === "media"), [breakdowns]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <BreakdownTable title="Bandwidth by User" rows={users} />
      <BreakdownTable title="Bandwidth by Media Asset" rows={media} />
    </div>
  );
}

function BreakdownTable({ title, rows }) {
  const [sortKey, setSortKey] = useState("total_bandwidth_kb");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let av = a[sortKey] || 0, bv = b[sortKey] || 0;
      if (sortKey === "label") { av = (a.label || "").toLowerCase(); bv = (b.label || "").toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  const toggle = (k) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };
  const SortTh = ({ k, label, cls = "" }) => (
    <th className={`py-2 px-3 cursor-pointer select-none hover:text-zinc-300 ${cls}`} onClick={() => toggle(k)}>
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="w-3 h-3" /></span>
    </th>
  );

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
      <h3 className="text-sm font-semibold text-zinc-300 px-4 py-3 border-b border-zinc-800/60">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <SortTh k="label" label="Name" />
              <SortTh k="total_bandwidth_kb" label="Data Transferred" />
              <SortTh k="stream_count" label="Syncs" />
              <SortTh k="peak_bitrate" label="Peak (kbps)" />
              <SortTh k="last_updated" label="Last Active" className="text-right" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-zinc-500">No data yet.</td></tr>
            ) : sorted.map((r) => (
              <tr key={r.id} className="border-t border-zinc-800/50 text-zinc-300">
                <td className="py-2 px-3 text-zinc-200 truncate max-w-[180px]">{r.label}</td>
                <td className="py-2 px-3 text-lime-400 font-medium">{formatBandwidth(r.total_bandwidth_kb)}</td>
                <td className="py-2 px-3 text-zinc-400">{r.stream_count || 0}</td>
                <td className="py-2 px-3 text-zinc-400">{(r.peak_bitrate || 0).toLocaleString()}</td>
                <td className="py-2 px-3 text-right text-zinc-500">{r.last_updated ? moment(r.last_updated).fromNow() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}