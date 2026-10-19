import React from "react";
import { AlertTriangle, Gauge, Users, Plane } from "lucide-react";
import moment from "moment";

const TYPE_META = {
  concurrent_limit: { icon: Users, label: "Concurrent Stream Limit" },
  impossible_travel: { icon: Plane, label: "Impossible Travel" },
  geo_mismatch: { icon: AlertTriangle, label: "Geo Mismatch" },
  other: { icon: AlertTriangle, label: "Other" },
};

const SEVERITY_CLS = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

// Violations & Trust Scores — automated rule violation tracking + trust score.
export default function ViolationsSection({ violations, trustScore }) {
  const color = trustScore >= 80 ? "text-lime-400" : trustScore >= 50 ? "text-amber-400" : "text-red-400";
  const ring = trustScore >= 80 ? "#a3e635" : trustScore >= 50 ? "#fbbf24" : "#f87171";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#27272a" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke={ring} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(trustScore / 100) * 214} 214`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Gauge className={`w-7 h-7 ${color}`} />
          </div>
        </div>
        <div>
          <div className={`text-3xl font-bold ${color}`}>{trustScore}</div>
          <div className="text-sm text-zinc-400">Trust Score</div>
          <div className="text-xs text-zinc-500 mt-1">
            {violations.length === 0 ? "No violations recorded" : `${violations.length} violation${violations.length > 1 ? "s" : ""} on record`}
          </div>
        </div>
      </div>

      {violations.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-4">No violations detected.</p>
      ) : (
        <div className="space-y-2">
          {violations.map((v) => {
            const meta = TYPE_META[v.type] || TYPE_META.other;
            const Icon = meta.icon;
            return (
              <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/50">
                <Icon className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-200">{meta.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md border ${SEVERITY_CLS[v.severity]}`}>{v.severity}</span>
                  </div>
                  {v.description && <p className="text-xs text-zinc-400 mt-1">{v.description}</p>}
                  <div className="text-xs text-zinc-600 mt-1">{v.detected_at ? moment(v.detected_at).format("MMM D, YYYY h:mm A") : "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}