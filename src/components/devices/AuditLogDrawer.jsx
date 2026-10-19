import React, { useState } from "react";
import { ChevronDown, History, Power, KeyRound, ShieldX, ShieldCheck } from "lucide-react";
import moment from "moment";

export default function AuditLogDrawer({ logs }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-lime-400" /> Real-Time Audit Log
          {logs.length > 0 && <span className="text-xs text-slate-500">({logs.length})</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-slate-800 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No security actions recorded yet.</p>
          ) : (
            logs.map((log) => {
              const isAuthHandshake = log.device_name === "Auth Handshake";
              const isPassword = log.reason?.toLowerCase().includes("password");
              const isRevoke = log.reason?.toLowerCase().includes("revoke");
              const Icon = isAuthHandshake ? ShieldCheck : isPassword ? KeyRound : isRevoke ? ShieldX : Power;
              const iconColor = isAuthHandshake ? "text-indigo-400" : isPassword ? "text-amber-400" : isRevoke ? "text-rose-400" : "text-lime-400";
              const actionLabel = isAuthHandshake ? "Auth Handshake" : isPassword ? "Password Reset" : isRevoke ? "Token Revoked" : "Stream Terminated";
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/50 text-xs">
                  <Icon className={`w-3.5 h-3.5 ${iconColor} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 truncate">
                      <span className="font-semibold">{log.triggered_by}:</span> {actionLabel}: {log.device_name}
                    </p>
                    <p className="text-slate-500">{log.reason || "No reason provided"}</p>
                  </div>
                  <span className="text-slate-500 flex-shrink-0">{moment(log.terminated_at || log.created_date).fromNow()}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}