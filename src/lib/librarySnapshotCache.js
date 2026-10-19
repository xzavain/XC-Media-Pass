import { base44 } from "@/api/base44Client";
import { plexGetLibrarySizes, embyGetLibrarySizes } from "@/lib/storageApi";
import { mapWithLimit } from "@/lib/concurrency";

// Convert cached LibrarySnapshot records into the results shape the dashboard
// and charts expect: { [serverId]: { libraries, totalSize, itemCount } }.
export function snapshotsToResults(snapshots) {
  // Dedupe by server + library_id, keeping the entry with the largest storage.
  const deduped = {};
  for (const snap of snapshots) {
    const key = `${snap.server_id}|${snap.library_id}`;
    const prev = deduped[key];
    if (!prev || (snap.storage_bytes || 0) > (prev.storage_bytes || 0)) deduped[key] = snap;
  }
  const results = {};
  for (const snap of Object.values(deduped)) {
    const sid = snap.server_id;
    if (!results[sid]) results[sid] = { loading: false, libraries: [], totalSize: 0, itemCount: 0, cached: true };
    results[sid].libraries.push({
      id: snap.library_id,
      name: snap.library_name,
      type: null,
      itemCount: snap.item_count || 0,
      totalSize: snap.storage_bytes || 0,
    });
    results[sid].totalSize += snap.storage_bytes || 0;
    results[sid].itemCount += snap.item_count || 0;
  }
  return results;
}

// Read all cached snapshots (instant — no server calls).
export async function loadSnapshots() {
  try {
    return await base44.entities.LibrarySnapshot.list();
  } catch {
    return [];
  }
}

// Upsert LibrarySnapshot records for a server from fresh library sizes.
async function upsertSnapshots(srv, libs) {
  const existing = await base44.entities.LibrarySnapshot.filter({ server_id: srv.id });
  // Collapse any duplicate snapshots for the same library_id (keep the largest).
  const keepByLibId = new Map();
  const dupIds = [];
  for (const s of existing) {
    const prev = keepByLibId.get(s.library_id);
    if (!prev) keepByLibId.set(s.library_id, s);
    else if ((s.storage_bytes || 0) > (prev.storage_bytes || 0)) { dupIds.push(prev.id); keepByLibId.set(s.library_id, s); }
    else dupIds.push(s.id);
  }
  if (dupIds.length) await Promise.all(dupIds.map((id) => base44.entities.LibrarySnapshot.delete(id)));

  const freshIds = new Set(libs.map((l) => String(l.id)));
  await Promise.all(libs.map((lib) => {
    const data = {
      server_id: srv.id,
      server_name: srv.name,
      platform: srv.platform,
      library_id: String(lib.id),
      library_name: lib.name,
      item_count: lib.itemCount || 0,
      storage_bytes: lib.totalSize || 0,
    };
    const match = keepByLibId.get(String(lib.id));
    return match
      ? base44.entities.LibrarySnapshot.update(match.id, data)
      : base44.entities.LibrarySnapshot.create(data);
  }));

  // Remove snapshots for libraries that no longer exist on the server.
  const stale = [...keepByLibId.values()].filter((s) => !freshIds.has(s.library_id));
  if (stale.length) await Promise.all(stale.map((s) => base44.entities.LibrarySnapshot.delete(s.id)));
}

// Fetch fresh sizes for every server in parallel, persist them to the cache,
// and return a fresh results map. Never throws — one bad server doesn't block
// the others, so the background refresh can't hang the dashboard.
export async function refreshSnapshots(servers) {
  const fresh = {};
  await mapWithLimit(servers, 2, async (srv) => {
    try {
      const libs = srv.platform === "plex"
        ? await plexGetLibrarySizes(srv.url, srv.api_key)
        : await embyGetLibrarySizes(srv.url, srv.api_key);
      fresh[srv.id] = {
        loading: false,
        libraries: libs,
        totalSize: libs.reduce((s, l) => s + (l.totalSize || 0), 0),
        itemCount: libs.reduce((s, l) => s + (l.itemCount || 0), 0),
      };
      await upsertSnapshots(srv, libs);
    } catch (e) {
      fresh[srv.id] = { loading: false, error: e.message };
    }
  });
  return fresh;
}