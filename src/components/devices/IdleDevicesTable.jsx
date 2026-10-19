import React from "react";
import { ShieldX, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import NodePlatformBadge from "@/components/diagnostics/NodePlatformBadge";
import moment from "moment";

export default function IdleDevicesTable({ sessions, onRevoke }) {
  const idle = sessions.filter((s) => s.playback_state === "idle");

  if (idle.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-500">
        <Monitor className="w-6 h-6 mx-auto mb-2 opacity-40" />
        No idle registered devices.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-800">
            <th className="py-2 px-3 font-medium">Device / OS</th>
            <th className="py-2 px-3 font-medium">Platform</th>
            <th className="py-2 px-3 font-medium">IP & Location</th>
            <th className="py-2 px-3 font-medium">Last Seen</th>
            <th className="py-2 px-3 font-medium">Auth Status</th>
            <th className="py-2 px-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {idle.map((s) => (
            <tr key={s.session_key} className="border-b border-slate-800/50 hover:bg-slate-800/20">
              <td className="py-2.5 px-3 text-slate-200">{s.device_name}</td>
              <td className="py-2.5 px-3"><NodePlatformBadge serviceType={s.service_type} size="sm" /></td>
              <td className="py-2.5 px-3 text-slate-400">
                {s.geo_flag_emoji || "🌐"} {s.geo_city || "Unknown"} ({s.ip_address || "N/A"})
              </td>
              <td className="py-2.5 px-3 text-slate-500">{moment().fromNow()}</td>
              <td className="py-2.5 px-3">
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-semibold">Authorized</span>
              </td>
              <td className="py-2.5 px-3">
                <Button onClick={() => onRevoke(s)} variant="ghost" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 text-xs gap-1">
                  <ShieldX className="w-3 h-3" /> Revoke
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}