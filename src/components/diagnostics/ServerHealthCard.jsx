import React from "react";
import NodePlatformBadge from "./NodePlatformBadge";
import { MapPin, Activity, Clock, AlertTriangle, Info, AlertCircle, Wrench } from "lucide-react";

const statusConfig = {
  operational: { dot: "bg-emerald-400", glow: "shadow-[0_0_10px_rgba(52,211,153,0.5)]", label: "Operational", text: "text-emerald-400", border: "border-emerald-500/20" },
  degraded: { dot: "bg-amber-400", glow: "shadow-[0_0_10px_rgba(251,191,36,0.5)]", label: "Degraded", text: "text-amber-400", border: "border-amber-500/20" },
  maintenance: { dot: "bg-indigo-400", glow: "shadow-[0_0_10px_rgba(129,140,248,0.5)]", label: "Maintenance", text: "text-indigo-400", border: "border-indigo-500/20" },
  offline: { dot: "bg-rose-500", glow: "shadow-[0_0_10px_rgba(244,63,94,0.5)]", label: "Offline", text: "text-rose-400", border: "border-rose-500/20" },
};

const alertIconConfig = {
  info: { icon: Info, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  critical: { icon: AlertCircle, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  maintenance: { icon: Wrench, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
};

export default function ServerHealthCard({ server, alerts = [] }) {
  const status = statusConfig[server.status] || statusConfig.operational;
  const serverAlerts = alerts.filter(
    (a) => a.is_active && (a.is_all_servers || a.server_id === server.id)
  );

  return (
    <div className={`rounded-xl border ${status.border} bg-zinc-900/40 backdrop-blur-sm overflow-hidden`}>
      {serverAlerts.map((alert) => {
        const cfg = alertIconConfig[alert.severity] || alertIconConfig.info;
        const Icon = cfg.icon;
        return (
          <div key={alert.id} className={`flex items-start gap-2 px-4 py-2.5 ${cfg.bg} ${cfg.border} border-b text-xs`}>
            <Icon className={`w-3.5 h-3.5 ${cfg.color} flex-shrink-0 mt-0.5`} />
            <div>
              <p className={`font-semibold ${cfg.color}`}>{alert.title}</p>
              <p className="text-zinc-400 mt-0.5" dangerouslySetInnerHTML={{ __html: alert.message }} />
            </div>
          </div>
        );
      })}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <NodePlatformBadge serviceType={server.service_type} name={server.name} />
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${status.dot} ${status.glow}`} />
            <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
          </div>
        </div>
        {server.region && (
          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin className="w-3 h-3" /> {server.region}
          </p>
        )}
        <div className="flex items-center justify-between text-xs">
          {server.uptime_percentage != null && (
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Activity className="w-3 h-3 text-lime-400" /> {server.uptime_percentage}% uptime
            </span>
          )}
          {server.maintenance_window && (
            <span className="flex items-center gap-1.5 text-indigo-400">
              <Clock className="w-3 h-3" /> {server.maintenance_window}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}