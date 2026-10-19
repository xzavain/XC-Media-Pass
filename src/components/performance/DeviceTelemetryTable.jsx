import React, { useState, useMemo } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

// Comprehensive device telemetry table with filtering (server, user, active
// state, streaming decision) and column sorting.
export default function DeviceTelemetryTable({ devices, servers }) {
  const [q, setQ] = useState("");
  const [serverFilter, setServerFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [sortKey, setSortKey] = useState("last_seen");
  const [sortDir, setSortDir] = useState("desc");

  const filtered = useMemo(() => {
    let rows = devices.filter((d) => {
      if (serverFilter !== "all" && d.server_id !== serverFilter) return false;
      if (stateFilter === "active" && !d.is_active) return false;
      if (stateFilter === "historical" && d.is_active) return false;
      if (decisionFilter !== "all" && d.transcode_decision !== decisionFilter) return false;
      if (q) {
        const hay = `${d.device} ${d.player} ${d.client_app} ${d.username} ${d.ip_address}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    rows.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "last_seen") { av = av ? new Date(av).getTime() : 0; bv = bv ? new Date(bv).getTime() : 0; }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [devices, q, serverFilter, stateFilter, decisionFilter, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortHeader = ({ k, label, className = "" }) => (
    <th className={`py-2 px-3 cursor-pointer select-none hover:text-zinc-300 ${className}`} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="w-3 h-3" /></span>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search device, user, IP…" className="pl-8 bg-zinc-950 border-zinc-700 text-zinc-100" />
        </div>
        <Select value={serverFilter} onValueChange={setServerFilter}>
          <SelectTrigger className="w-[160px] bg-zinc-950 border-zinc-700 text-zinc-100"><SelectValue placeholder="Server" /></SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">All Servers</SelectItem>
            {servers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[140px] bg-zinc-950 border-zinc-700 text-zinc-100"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="historical">Historical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={decisionFilter} onValueChange={setDecisionFilter}>
          <SelectTrigger className="w-[150px] bg-zinc-950 border-zinc-700 text-zinc-100"><SelectValue placeholder="Method" /></SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="direct play">Direct Play</SelectItem>
            <SelectItem value="transcode">Transcode</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800/60">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <SortHeader k="device" label="Device" />
              <SortHeader k="client_app" label="Client / Version" />
              <SortHeader k="username" label="User" />
              <th className="py-2 px-3 text-left">IP / Location</th>
              <SortHeader k="transcode_decision" label="Method" />
              <SortHeader k="resolution" label="Resolution" />
              <SortHeader k="compatibility_score" label="Compat" />
              <th className="py-2 px-3 text-left">Profile</th>
              <SortHeader k="last_seen" label="Last Seen" className="text-right" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-zinc-500">No devices match the current filters.</td></tr>
            ) : filtered.map((d) => (
              <tr key={d.id} className="border-t border-zinc-800/50 text-zinc-300">
                <td className="py-2 px-3">
                  <div className="text-zinc-200">{d.device}</div>
                  <div className="text-xs text-zinc-500">{d.player}</div>
                </td>
                <td className="py-2 px-3">
                  <div className="text-zinc-200">{d.client_app || "—"}</div>
                  <div className="text-xs text-zinc-500">{d.client_version || ""}</div>
                </td>
                <td className="py-2 px-3 text-zinc-400">{d.username || "—"}</td>
                <td className="py-2 px-3">
                  <div className="font-mono text-xs text-zinc-400">{d.ip_address || "—"}</div>
                  <div className="text-xs text-zinc-500">
                    {d.geo ? `${d.geo.city || ""}${d.geo.city ? ", " : ""}${d.geo.country || ""}` : ""}
                    {d.geo?.asn ? ` · ${d.geo.asn}` : ""}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-md ${d.transcode_decision === "transcode" ? "bg-amber-500/10 text-amber-400" : "bg-lime-500/10 text-lime-400"}`}>
                    {d.transcode_decision || "—"}
                  </span>
                </td>
                <td className="py-2 px-3 text-zinc-400">{d.resolution || "—"}</td>
                <td className="py-2 px-3">
                  <span className={d.compatibility_score >= 90 ? "text-lime-400" : d.compatibility_score >= 70 ? "text-amber-400" : "text-red-400"}>
                    {d.compatibility_score ?? "—"}
                  </span>
                </td>
                <td className="py-2 px-3 text-xs text-zinc-400">{d.streaming_profile || "—"}</td>
                <td className="py-2 px-3 text-right text-xs text-zinc-500">
                  {d.last_seen ? moment(d.last_seen).fromNow() : "—"}
                  <div className={`text-xs ${d.is_active ? "text-lime-400" : "text-zinc-600"}`}>{d.is_active ? "● active" : "○ idle"}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-600">{filtered.length} of {devices.length} devices</p>
    </div>
  );
}