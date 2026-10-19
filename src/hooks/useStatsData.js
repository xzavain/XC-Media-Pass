import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Shared data hook for all Stats pages. Loads persisted playback sessions,
// media servers, server users (for admin profile linking), and content items
// (for poster artwork). Subscribes to real-time session updates so the
// stream ledger stays live without manual refresh.
export function useStatsData() {
  const [sessions, setSessions] = useState([]);
  const [servers, setServers] = useState([]);
  const [serverUsers, setServerUsers] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [sess, srv, su, ci] = await Promise.all([
      base44.entities.PlaybackSession.list("-started_at", 2000),
      base44.entities.MediaServer.list(),
      base44.entities.ServerUser.list(),
      base44.entities.ContentItem.list("-created_date", 500),
    ]);
    setSessions(sess);
    setServers(srv);
    setServerUsers(su);
    setContentItems(ci);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (err) {
        console.error("Stats data load failed", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  // Real-time subscription: keep the stream ledger live
  useEffect(() => {
    const unsubscribe = base44.entities.PlaybackSession.subscribe((event) => {
      setSessions((prev) => {
        if (event.type === "create") return [event.data, ...prev];
        if (event.type === "update") return prev.map((s) => (s.id === event.data.id ? event.data : s));
        if (event.type === "delete") return prev.filter((s) => s.id !== event.data.id);
        return prev;
      });
    });
    return unsubscribe;
  }, []);

  return { sessions, servers, serverUsers, contentItems, loading, reload: load };
}