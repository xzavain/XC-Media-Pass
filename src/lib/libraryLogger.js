import { base44 } from "@/api/base44Client";

// Snapshots are throttled per-library so we build a clean daily trend
// without flooding the database on every page visit.
const SNAPSHOT_INTERVAL_MS = 20 * 60 * 60 * 1000; // ~20 hours
const lastLoggedAt = new Map();

export async function logLibrarySnapshot(server, library, stats) {
  const key = `${server.id}:${library.id}`;
  const now = Date.now();
  if (now - (lastLoggedAt.get(key) || 0) < SNAPSHOT_INTERVAL_MS) return;
  lastLoggedAt.set(key, now);

  await base44.entities.LibrarySnapshot.create({
    server_id: server.id,
    server_name: server.name,
    platform: server.platform,
    library_id: library.id,
    library_name: library.name,
    item_count: stats.itemCount,
    storage_bytes: stats.storageBytes,
  });
}