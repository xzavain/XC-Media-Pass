import { useState, useEffect, useRef, useCallback } from "react";
import { useMediaAuth } from "@/lib/MediaAuthContext";
import { useAuth } from "@/lib/AuthContext";
import { runInboundSync } from "@/lib/watchlistSyncApi";
import { base44 } from "@/api/base44Client";

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = "watchlist_last_sync";

/**
 * Automatically runs the inbound favorites sync (Plex/Emby/Jellyfin → watchlist)
 * once per day when the hook mounts, without requiring a manual button press.
 *
 * Returns { status, lastSync, triggerSync }
 *   status: "idle" | "syncing" | "complete" | "skipped" | "error"
 */
export function useAutoSync() {
  const { identity, nodes } = useMediaAuth();
  const { user, checkUserAuth } = useAuth();
  const [status, setStatus] = useState("idle");
  const [lastSync, setLastSync] = useState(null);
  const ranRef = useRef(false);

  // Load last sync timestamp from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setLastSync(JSON.parse(stored)); } catch {}
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!identity || !user) return { status: "skipped" };
    setStatus("syncing");
    try {
      const currentWatchlist = user.watchlist || [];
      const result = await runInboundSync(identity, nodes, currentWatchlist);

      if (result.totalImported > 0) {
        await base44.auth.updateMe({ watchlist: result.mergedWatchlist });
        await checkUserAuth();
      }

      const syncMeta = {
        timestamp: result.timestamp,
        totalImported: result.totalImported,
        plex: { found: result.plex.itemsFound, imported: result.plex.itemsImported, status: result.plex.status },
        emby: { found: result.emby.itemsFound, imported: result.emby.itemsImported, status: result.emby.status },
        jellyfin: { found: result.jellyfin.itemsFound, imported: result.jellyfin.itemsImported, status: result.jellyfin.status },
      };
      setLastSync(syncMeta);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(syncMeta));
      setStatus("complete");
      return { status: "complete", result };
    } catch (err) {
      setStatus("error");
      return { status: "error", error: err.message };
    }
  }, [identity, user, nodes, checkUserAuth]);

  // Auto-trigger on mount if 24h have passed since last sync
  useEffect(() => {
    if (ranRef.current) return;
    if (!identity || !user) return;

    const lastTs = lastSync?.timestamp;
    const elapsed = lastTs ? Date.now() - new Date(lastTs).getTime() : SYNC_INTERVAL_MS;

    if (elapsed >= SYNC_INTERVAL_MS) {
      ranRef.current = true;
      triggerSync();
    } else {
      setStatus("skipped");
    }
  }, [identity, user, lastSync, triggerSync]);

  return { status, lastSync, triggerSync };
}