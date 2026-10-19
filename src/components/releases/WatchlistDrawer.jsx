import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, Bell, BellOff, CheckCircle2 } from "lucide-react";
import { posterUrl } from "@/lib/releaseApi";

export default function WatchlistDrawer({ open, onOpenChange, watchlist, releases, onRemove, onToggleAlerts, onForceSync, syncing }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-slate-950 border-slate-800 text-slate-100 w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold text-white">Universal Watchlist</SheetTitle>
          <p className="text-xs text-slate-400">Plex + Emby + Jellyfin</p>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Automatically synced with your connected profiles
          </div>

          <Button onClick={onForceSync} disabled={syncing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Force Sync Watchlist Now"}
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {watchlist.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No bookmarked titles yet.</p>
          ) : (
            watchlist.map((item) => {
              const release = releases.find((r) => r.id === item.media_release_id);
              if (!release) return null;
              return (
                <div key={item.id} className="flex gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <img src={posterUrl(release.poster_path, "w185")} alt="" className="w-12 h-18 rounded object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{release.title}</h4>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <button
                        onClick={() => onToggleAlerts(item)}
                        className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${item.notify_server_import ? "text-indigo-400 bg-indigo-500/10" : "text-slate-500 bg-slate-800"}`}
                      >
                        {item.notify_server_import ? <Bell className="w-2.5 h-2.5" /> : <BellOff className="w-2.5 h-2.5" />}
                        {item.notify_server_import ? "Alerts On" : "Alerts Off"}
                      </button>
                      <button
                        onClick={() => onRemove(item)}
                        className="text-[10px] px-2 py-0.5 rounded-full text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 flex items-center gap-1"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}