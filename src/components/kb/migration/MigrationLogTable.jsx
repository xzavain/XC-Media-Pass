import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";

const statusConfig = {
  running: { color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Loader2, label: "Running" },
  completed: { color: "text-lime-400 bg-lime-500/10 border-lime-500/20", icon: CheckCircle2, label: "Completed" },
  partial: { color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: AlertCircle, label: "Partial" },
  failed: { color: "text-red-400 bg-red-500/10 border-red-500/20", icon: AlertCircle, label: "Failed" },
};

export default function MigrationLogTable({ refreshKey }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    const list = await base44.entities.KbMigrationLog.list("-created_date", 20);
    setLogs(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) return <p className="text-sm text-zinc-500 text-center py-4">Loading migration history...</p>;
  if (logs.length === 0) return <p className="text-sm text-zinc-600 text-center py-4">No migrations yet.</p>;

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const cfg = statusConfig[log.status] || statusConfig.failed;
        const Icon = cfg.icon;
        const isExpanded = expanded === log.id;
        return (
          <div key={log.id} className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
            <button
              onClick={() => setExpanded(isExpanded ? null : log.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${log.status === "running" ? "animate-spin" : ""} ${cfg.color.split(" ")[0]}`} />
                <div className="text-left">
                  <p className="text-sm text-zinc-200">{log.source_url}</p>
                  <p className="text-xs text-zinc-500">{moment(log.created_date).format("MMM D, YYYY h:mm A")} · by {log.run_by_name || log.run_by_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-xs text-zinc-500">
                  <p>{log.imported_books || 0} books · {log.imported_chapters || 0} chapters · {log.imported_pages || 0} pages</p>
                  {log.failed_items > 0 && <p className="text-amber-400">{log.failed_items} failed</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-md border ${cfg.color}`}>{cfg.label}</span>
              </div>
            </button>
            {isExpanded && log.errors?.length > 0 && (
              <div className="px-4 pb-3 space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Errors ({log.errors.length})</p>
                {log.errors.map((err, i) => (
                  <div key={i} className="text-xs text-zinc-400 px-2 py-1 rounded bg-zinc-800/40">
                    <span className="text-red-400">[{err.entity_type}]</span> {err.source_name || err.source_id}: {err.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}