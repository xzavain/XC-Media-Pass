import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMediaAuth } from "@/lib/MediaAuthContext";
import { User, Server, CreditCard, Activity, Clock } from "lucide-react";
import moment from "moment";

export default function CustomerContextSidebar({ ticket }) {
  const { accounts, nodes } = useMediaAuth();
  const [billingCustomer, setBillingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticket?.customer_id) return;
    Promise.allSettled([
      base44.entities.BillingCustomer.filter({ user_id: ticket.customer_id }),
    ]).then(([bcResult]) => {
      if (bcResult.status === "fulfilled") setBillingCustomer(bcResult.value[0] || null);
      setLoading(false);
    });
  }, [ticket]);

  if (!ticket) return null;

  const snapshot = ticket.diagnostic_snapshot;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> Customer
        </h3>
        <div className="space-y-1.5 text-sm">
          <p className="text-slate-200 font-medium">{ticket.customer_name || "Unknown"}</p>
          <p className="text-xs text-slate-500">{ticket.customer_email}</p>
          {ticket.ticket_number && <p className="text-xs font-mono text-slate-500">{ticket.ticket_number}</p>}
        </div>
      </div>

      {billingCustomer && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> Billing
          </h3>
          <div className="text-sm space-y-1">
            <p className="text-slate-300">{billingCustomer.plan_name || "No active plan"}</p>
            {billingCustomer.renewal_date && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Renews {moment(billingCustomer.renewal_date).format("MMM D, YYYY")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5" /> Assigned Servers
        </h3>
        {accounts.length > 0 ? (
          <div className="space-y-1.5">
            {accounts.map((a, i) => {
              const node = nodes.find((n) => n.id === a.server_id);
              return (
                <div key={i} className="text-xs text-slate-300 flex items-center justify-between">
                  <span>{node?.node_name || a.server_id}</span>
                  <span className="text-slate-500 capitalize">{a.service_type}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-600">No servers linked</p>
        )}
      </div>

      {snapshot && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
          <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wide flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Diagnostic Snapshot
          </h3>
          <div className="text-xs space-y-1 text-slate-300">
            {snapshot.linked_services && (
              <p>Services: {snapshot.linked_services.join(", ")}</p>
            )}
            {snapshot.active_stream_count !== undefined && (
              <p>Active streams: {snapshot.active_stream_count}</p>
            )}
            {snapshot.active_streams?.length > 0 && (
              <div className="space-y-1 mt-1">
                {snapshot.active_streams.map((s, i) => (
                  <div key={i} className="text-[11px] text-slate-500">
                    {s.device}: {s.title} ({s.state})
                  </div>
                ))}
              </div>
            )}
            {snapshot.client_info && (
              <p className="text-[11px] text-slate-600 truncate" title={snapshot.client_info}>
                Client: {snapshot.client_info.substring(0, 80)}...
              </p>
            )}
          </div>
        </div>
      )}

      {ticket.sla_due_at && (
        <SlaTimer dueAt={ticket.sla_due_at} />
      )}
    </div>
  );
}

function SlaTimer({ dueAt }) {
  const due = moment(dueAt);
  const now = moment();
  const hoursLeft = due.diff(now, "hours", true);
  const isBreached = hoursLeft < 0;
  const isWarning = hoursLeft < 4 && hoursLeft >= 0;

  return (
    <div className={`rounded-xl border p-4 space-y-1 ${
      isBreached ? "border-rose-500/30 bg-rose-500/10" : isWarning ? "border-amber-500/30 bg-amber-500/10" : "border-slate-800 bg-slate-900/40"
    }`}>
      <h3 className={`text-xs font-semibold uppercase tracking-wide ${
        isBreached ? "text-rose-400" : isWarning ? "text-amber-400" : "text-slate-400"
      }`}>
        SLA {isBreached ? "Breached" : "Timer"}
      </h3>
      <p className={`text-sm font-mono ${isBreached ? "text-rose-400" : isWarning ? "text-amber-400" : "text-slate-300"}`}>
        {isBreached ? `${Math.abs(hoursLeft).toFixed(1)}h overdue` : `${hoursLeft.toFixed(1)}h remaining`}
      </p>
    </div>
  );
}