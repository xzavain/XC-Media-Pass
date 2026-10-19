import React, { useState } from "react";
import { Pause, Play, Wifi, Zap, Ban } from "lucide-react";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import KillSessionDialog from "@/components/sessions/KillSessionDialog";
import SessionDetailsModal from "@/components/sessions/SessionDetailsModal";

export default function SessionCard({ session, server, onKilled, selectable, selected, onToggleSelect }) {
  const [killOpen, setKillOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isTranscode = session.transcode_decision === "transcode";

  return (
    <div
      onClick={() => setDetailsOpen(true)}
      className={`flex gap-3 bg-zinc-900/50 border rounded-xl p-3 cursor-pointer transition-colors overflow-hidden ${selected ? "border-lime-500/60" : "border-zinc-800/60 hover:border-zinc-700"}`}
    >
      {session.artwork_url && (
        <div className="flex-shrink-0 w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 self-start">
          <img
            src={session.artwork_url}
            alt={session.title}
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
          />
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {selectable && (
              <Checkbox
                checked={!!selected}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={() => onToggleSelect?.()}
                className="border-zinc-600"
              />
            )}
            <PlatformBadge platform={session.platform} />
            <span className="text-sm font-medium text-zinc-200 truncate">{session.username}</span>
          </div>
          {session.state === "paused" ? (
            <Pause className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          ) : (
            <Play className="w-4 h-4 text-lime-400 flex-shrink-0" />
          )}
        </div>

        <p className="text-sm text-zinc-300 truncate">{session.title}</p>
        <p className="text-xs text-zinc-600 truncate">{session.server_name}</p>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="truncate">{session.device}</span>
          {session.ip_address && (
            <span className="flex items-center gap-1 flex-shrink-0">
              <Wifi className="w-3 h-3" /> {session.ip_address}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-lime-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, session.progress_percent))}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">{session.progress_percent}%</span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${isTranscode ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-lime-500/10 text-lime-400 border-lime-500/20"}`}>
              <Zap className="w-3 h-3" /> {isTranscode ? "Transcode" : "Direct Play"}
            </span>
          </div>
        </div>

        {server && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setKillOpen(true); }}
            className="w-full border-zinc-700 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 gap-1.5"
          >
            <Ban className="w-3.5 h-3.5" /> Stop Stream
          </Button>
        )}
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <KillSessionDialog
          open={killOpen}
          onOpenChange={setKillOpen}
          server={server}
          session={session}
          onKilled={onKilled}
        />
        <SessionDetailsModal open={detailsOpen} onOpenChange={setDetailsOpen} session={session} />
      </div>
    </div>
  );
}