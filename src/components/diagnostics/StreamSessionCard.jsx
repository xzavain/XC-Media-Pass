import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, AlertTriangle, Lightbulb, Film } from "lucide-react";
import NodePlatformBadge, { serviceTypeLabel } from "./NodePlatformBadge";

const streamModeConfig = {
  direct_play: { label: "Direct Play", color: "text-emerald-400", bg: "bg-emerald-500/10", glow: "shadow-[0_0_12px_rgba(52,211,153,0.3)]", border: "border-emerald-500/30" },
  direct_stream: { label: "Direct Stream", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
  transcode: { label: "Transcoding", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
};

export default function StreamSessionCard({ session, server, onCopyReport }) {
  const [showAdvisor, setShowAdvisor] = useState(false);
  const mode = streamModeConfig[session.stream_mode] || streamModeConfig.direct_play;
  const is4KTranscode = session.resolution?.includes("4K") && session.stream_mode === "transcode";
  const needsAdvisor = session.stream_mode === "transcode" || session.is_buffering;

  return (
    <div className={`rounded-xl border ${is4KTranscode ? "border-rose-500/30" : "border-zinc-800/60"} bg-zinc-900/40 backdrop-blur-sm overflow-hidden`}>
      {is4KTranscode && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-400">⚠️ 4K Transcoding is strictly prohibited on all nodes.</p>
            <p className="text-xs text-zinc-400 mt-0.5">Your stream has halted or is being dropped because the player requested a transcode. See the optimization guide below.</p>
          </div>
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          {session.media_poster_url ? (
            <img src={session.media_poster_url} alt={session.media_title} className="w-16 h-24 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-24 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <Film className="w-6 h-6 text-zinc-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{session.media_title}</h4>
            <div className="flex items-center gap-2 mt-1">
              {server && <NodePlatformBadge serviceType={server.service_type} name={server.name} size="sm" />}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${mode.bg} ${mode.color} ${mode.border} ${session.stream_mode === "direct_play" ? mode.glow : ""}`}>
                {mode.label}
              </span>
              {session.resolution && (
                <span className="text-xs text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded">{session.resolution}</span>
              )}
              {session.is_buffering && (
                <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded animate-pulse">Buffering</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <Metric label="Bitrate" value={session.current_bitrate_mbps != null ? `${session.current_bitrate_mbps} Mbps` : "—"} />
          <Metric label="Buffer" value={session.buffer_health_seconds != null ? `${session.buffer_health_seconds}s` : "—"} />
          <Metric label="Video" value={session.video_codec || "—"} />
        </div>

        {session.transcode_reason && needsAdvisor && (
          <div className="text-xs text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
            <span className="font-semibold">Transcode Reason: </span>{session.transcode_reason}
          </div>
        )}

        {needsAdvisor && (
          <Button onClick={() => setShowAdvisor(!showAdvisor)} variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 w-full gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            {showAdvisor ? "Hide" : "Show"} Player Optimization Guide
          </Button>
        )}

        {showAdvisor && needsAdvisor && server && (
          <OptimizationGuide serviceType={server.service_type} />
        )}

        <Button onClick={onCopyReport} variant="ghost" className="text-zinc-400 hover:text-zinc-200 w-full gap-1.5 text-xs">
          <Copy className="w-3 h-3" /> Copy Technical Diagnostic Report
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-zinc-800/40 rounded-lg px-2 py-1.5">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-zinc-200 mt-0.5">{value}</p>
    </div>
  );
}

function OptimizationGuide({ serviceType }) {
  const guides = {
    plex: [
      "Open player Settings → Video Quality.",
      'Set "Remote Streaming Quality" to Maximum / Original (prevent downscaling).',
      'Set "Auto Adjust Quality" to OFF.',
      'Set Subtitles to "Burn Subtitles: Only Image Formats" or disable bitmap PGS/VOBSUB subtitles.',
      'Enable "Direct Play" and "Direct Stream" checkboxes in Advanced Debug settings.',
    ],
    emby: [
      "Click the Gear icon inside playback controls → Quality.",
      'Switch from "Auto" to "Direct / 4K - 120 Mbps (Original)".',
      "Enable hardware acceleration / native decoder in app settings.",
      "Select external SRT subtitles instead of embedded ASS/SSA or PGS formats.",
    ],
    jellyfin: [
      "Open playback settings → Streaming Quality.",
      'Set to "Original" / "Maximum" to prevent transcoding.',
      "Disable subtitle burning for PGS/ASS formats; use external SRT instead.",
      "Ensure hardware acceleration is enabled in server transcoding settings.",
    ],
  };
  const steps = guides[serviceType] || guides.plex;
  return (
    <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-indigo-300">Optimization steps for {serviceTypeLabel(serviceType)}:</p>
      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="text-xs text-zinc-300 flex gap-2">
            <span className="text-indigo-400 font-bold flex-shrink-0">{i + 1}.</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}