import React from "react";
import { Button } from "@/components/ui/button";
import { Power, Monitor, Globe, Clock } from "lucide-react";
import NodePlatformBadge from "@/components/diagnostics/NodePlatformBadge";
import { formatRuntime } from "@/lib/deviceSessionApi";
import moment from "moment";

const stateConfig = {
  playing: { label: "● PLAYING", color: "text-emerald-400", bg: "bg-emerald-500/10", glow: "shadow-[0_0_10px_rgba(52,211,153,0.4)]" },
  paused: { label: "❚❚ PAUSED", color: "text-amber-400", bg: "bg-amber-500/10" },
  buffering: { label: "⟳ BUFFERING", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  idle: { label: "IDLE", color: "text-slate-400", bg: "bg-slate-700/30" },
};

export default function DeviceSessionCard({ session, onKill }) {
  const state = stateConfig[session.playback_state] || stateConfig.playing;
  const isActive = session.playback_state !== "idle";
  const elapsed = formatRuntime(session.view_offset_ms);
  const duration = formatRuntime(session.duration_ms);

  return (
    <div className="relative rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-md overflow-hidden group">
      {/* Blurred backdrop */}
      {session.poster_url && (
        <div className="absolute inset-0 overflow-hidden">
          <img src={session.poster_url} alt="" className="w-full h-full object-cover blur-2xl scale-110 opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
        </div>
      )}

      <div className="relative p-4 space-y-3">
        {/* Top row: status pill + platform tag */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${state.bg} ${state.color} ${state.glow || ""}`}>
            {state.label}
          </span>
          <NodePlatformBadge serviceType={session.service_type} size="sm" />
        </div>

        {/* Poster + media info */}
        <div className="flex gap-3">
          {session.poster_url ? (
            <img src={session.poster_url} alt={session.media_title} className="w-20 h-32 rounded-lg object-cover flex-shrink-0 shadow-lg" />
          ) : (
            <div className="w-20 h-32 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Monitor className="w-6 h-6 text-slate-600" />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1.5">
            <h4 className="text-sm font-semibold text-white truncate">{session.media_title}</h4>
            {session.media_year && <p className="text-xs text-slate-500">{session.media_year}</p>}
            {session.resolution_badge && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded">{session.resolution_badge}</span>
                {session.video_codec && <span className="text-[10px] font-bold bg-slate-700/40 text-slate-300 px-1.5 py-0.5 rounded">{session.video_codec}</span>}
                {session.bitrate > 0 && <span className="text-[10px] font-bold bg-slate-700/40 text-slate-300 px-1.5 py-0.5 rounded">{session.bitrate} Mbps</span>}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isActive && session.duration_ms > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${session.progress_percent}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>{elapsed} / {duration}</span>
              <span>{session.progress_percent}%</span>
            </div>
          </div>
        )}

        {/* Device fingerprint */}
        <div className="space-y-1 text-xs text-slate-400">
          <p className="flex items-center gap-1.5"><Monitor className="w-3 h-3 text-slate-500" /> {session.device_name}</p>
          <p className="flex items-center gap-1.5 text-slate-500">{session.client_app} {session.client_version && `v${session.client_version}`}</p>
          <p className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-slate-500" />
            {session.geo_flag_emoji || "🌐"} {session.geo_city || "Unknown"}, {session.geo_country || "—"}
            <span className="text-slate-600">({session.ip_address || "N/A"})</span>
          </p>
          <p className="flex items-center gap-1.5 text-slate-500"><Clock className="w-3 h-3" /> Updated {moment().fromNow()}</p>
        </div>

        {/* Kill button */}
        {isActive && (
          <Button
            onClick={() => onKill(session)}
            className="w-full bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-500/30 gap-1.5"
          >
            <Power className="w-3.5 h-3.5" /> Kill Stream & Release Slot
          </Button>
        )}
      </div>
    </div>
  );
}