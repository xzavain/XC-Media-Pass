import React, { useState, useMemo } from "react";
import { AlertTriangle, ChevronUp, ChevronDown, ChevronsUpDown, FileX, Wifi, Type } from "lucide-react";
import { detectIssues } from "@/lib/auditApi";

const issueLabels = {
  "missing-path": { label: "Missing Path", icon: FileX, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  "non-ascii": { label: "Non-ASCII", icon: Type, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  "invalid-chars": { label: "Bad Chars", icon: AlertTriangle, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  "network-path": { label: "Network Path", icon: Wifi, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
};

function IssueBadge({ issue }) {
  const cfg = issueLabels[issue];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "—";
  const gb = bytes / 1073741824;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1048576;
  return `${mb.toFixed(1)} MB`;
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-zinc-600" />;
  return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-violet-400" /> : <ChevronDown className="w-3 h-3 text-violet-400" />;
}

export default function FilePathTable({ items, loading, troubleshootMode }) {
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const processed = useMemo(() => {
    let rows = items.map((item) => ({ ...item, issues: detectIssues(item.path) }));
    if (troubleshootMode) rows = rows.filter((r) => r.issues.length > 0);
    rows.sort((a, b) => {
      let av = a[sortField] || "";
      let bv = b[sortField] || "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return rows;
  }, [items, sortField, sortDir, troubleshootMode]);

  const ColHeader = ({ field, label, className = "" }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 select-none ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm gap-2">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
        Loading media items…
      </div>
    );
  }

  if (!items.length && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
        Select a library to inspect file paths.
      </div>
    );
  }

  if (troubleshootMode && !processed.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-emerald-500 text-sm gap-2">
        ✓ No path issues detected in this library.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800/60 z-10">
          <tr>
            <ColHeader field="name" label="Title" />
            <ColHeader field="path" label="File Path" className="w-[40%]" />
            <ColHeader field="type" label="Type" />
            <ColHeader field="size" label="Size" />
            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Issues</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/40">
          {processed.map((item) => {
            const hasIssue = item.issues.length > 0;
            return (
              <tr
                key={item.id}
                className={`transition-colors ${hasIssue ? "bg-rose-500/5 hover:bg-rose-500/8" : "hover:bg-zinc-800/30"}`}
              >
                <td className="px-4 py-2.5">
                  <span className="text-zinc-200 font-medium">{item.name}</span>
                </td>
                <td className="px-4 py-2.5 max-w-0">
                  <code className={`text-xs font-mono break-all leading-relaxed ${hasIssue ? "text-rose-300" : "text-zinc-400"}`}>
                    {item.path || <span className="text-rose-500 italic">No path recorded</span>}
                  </code>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-zinc-500 capitalize">{item.type}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-zinc-500 tabular-nums">{formatBytes(item.size)}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {item.issues.map((iss) => <IssueBadge key={iss} issue={iss} />)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}