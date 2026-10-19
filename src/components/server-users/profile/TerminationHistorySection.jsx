import React from "react";
import { Ban, Pause, Play, ShieldOff, ShieldCheck, XCircle } from "lucide-react";
import moment from "moment";

const ACTION_META = {
  stream_killed: { icon: XCircle, label: "Stream Killed", cls: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-500" },
  account_suspended: { icon: Pause, label: "Account Suspended", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-500" },
  account_reactivated: { icon: Play, label: "Account Reactivated", cls: "bg-lime-500/10 text-lime-400 border-lime-500/20", dot: "bg-lime-500" },
  access_revoked: { icon: ShieldOff, label: "Access Revoked", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20", dot: "bg-orange-500" },
  account_terminated: { icon: Ban, label: "Account Terminated", cls: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-500" },
};

// Termination History — audit trail of administrative actions and killed streams.
export default function TerminationHistorySection({ terminations }) {
  if (!terminations.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ShieldCheck className="w-8 h-8 text-lime-400/50 mb-2" />
        <p className="text-sm text-zinc-500">No administrative actions recorded.</p>
      </div>
    );
  }
  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-zinc-800" />
      {terminations.map((t) => {
        const meta = ACTION_META[t.action] || ACTION_META.stream_killed;
        const Icon = meta.icon;
        return (
          <div key={t.id} className="relative">
            <div className={`absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2 border-zinc-900 ${meta.dot}`} />
            <div className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-md border ${meta.cls}`}>{meta.label}</span>
                  {t.session_title && <span className="text-sm text-zinc-300 truncate">{t.session_title}</span>}
                </div>
                {t.reason && <p className="text-xs text-zinc-400 mt-1">{t.reason}</p>}
                <div className="text-xs text-zinc-600 mt-1">
                  {t.performed_by_name && <span>by {t.performed_by_name} · </span>}
                  {t.performed_at ? moment(t.performed_at).format("MMM D, YYYY h:mm A") : "—"}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}