import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { syncPerformance } from "@/lib/performanceSync";
import { useToast } from "@/components/ui/use-toast";

// Shared data hook for all Performance pages. Loads persisted snapshots,
// device telemetry, bandwidth breakdowns, and servers; exposes a manual
// refresh trigger that forces an immediate sync cycle.
export function usePerformance() {
  const [snapshots, setSnapshots] = useState([]);
  const [devices, setDevices] = useState([]);
  const [bandwidth, setBandwidth] = useState([]);
  const [servers, setServers] = useState([]);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const [sn, dv, bw, sv, sessions] = await Promise.all([
      base44.entities.PerformanceSnapshot.list("-captured_at", 200),
      base44.entities.DeviceTelemetry.list("-last_seen", 500),
      base44.entities.BandwidthBreakdown.list("-last_updated", 500),
      base44.entities.MediaServer.list(),
      base44.entities.PlaybackSession.list("-started_at", 500),
    ]);
    setSnapshots(sn);
    setDevices(dv);
    setBandwidth(bw);
    setServers(sv);
    setWatchSeconds(sessions.reduce((s, x) => s + (x.elapsed_seconds || 0), 0));
    setLastSync(sn[0]?.captured_at || null);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const summary = await syncPerformance({ force: true });
      await load();
      toast({
        title: "Analytics synced",
        description: `${summary.snapshots} server snapshots · ${summary.devices} devices · ${summary.bandwidth} bandwidth entries`,
      });
    } catch (err) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }, [load, toast]);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  return { snapshots, devices, bandwidth, servers, watchSeconds, loading, refreshing, lastSync, refresh, reload: load };
}