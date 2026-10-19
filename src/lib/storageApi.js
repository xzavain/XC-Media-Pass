import { plexGetLibraries, embyGetLibraries } from "@/lib/auditApi";
import { mapWithLimit } from "@/lib/concurrency";

// Large page sizes so each library finishes in 1–2 requests instead of
// hundreds of sequential round-trips. Libraries are fetched with bounded
// concurrency (2 at a time) to keep the load light on the media server.
const PLEX_PAGE = 2000;
const EMBY_PAGE = 20000;
const MAX_BATCHES = 1000; // safety guard against infinite pagination
const LIB_CONCURRENCY = 2;

// Dedupe a library list by id, keeping the entry with the largest totalSize.
function dedupeLibs(libs) {
  const map = new Map();
  for (const lib of libs) {
    const key = String(lib.id);
    const prev = map.get(key);
    if (!prev || (lib.totalSize || 0) > (prev.totalSize || 0)) map.set(key, lib);
  }
  return [...map.values()];
}

/**
 * Plex: total file size + item count per library section.
 * For show libraries we fetch episodes (type=4) so file-part sizes are present.
 * Completion is page-based (a short page means we've reached the end) — this
 * is reliable because Plex honors X-Plex-Container-Size.
 */
export async function plexGetLibrarySizes(baseUrl, token) {
  const base = baseUrl.replace(/\/$/, "");
  const libs = await plexGetLibraries(base, token);
  return dedupeLibs(await mapWithLimit(libs, LIB_CONCURRENCY, async (lib) => {
    const typeParam = lib.type === "show" ? "&type=4" : lib.type === "artist" ? "&type=10" : "";
    let totalSize = 0;
    let itemCount = 0;
    let start = 0;
    for (let guard = 0; guard < MAX_BATCHES; guard++) {
      const url = `${base}/library/sections/${lib.id}/all?X-Plex-Token=${token}${typeParam}&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${PLEX_PAGE}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) break;
      const data = await res.json();
      const meta = data?.MediaContainer?.Metadata || [];
      for (const item of meta) {
        for (const media of (item.Media || [])) {
          for (const part of (media.Part || [])) {
            if (part.size != null) totalSize += Number(part.size) || 0;
          }
        }
      }
      itemCount += meta.length;
      if (meta.length < PLEX_PAGE) break;
      start += PLEX_PAGE;
    }
    return { id: String(lib.id), name: lib.name, type: lib.type, itemCount, totalSize };
  }));
}

/**
 * Emby/Jellyfin: total file size + item count per virtual library.
 * Uses TotalRecordCount to detect completion and advances by items returned.
 */
export async function embyGetLibrarySizes(baseUrl, token) {
  const base = baseUrl.replace(/\/$/, "");
  const libs = await embyGetLibraries(base, token);
  return dedupeLibs(await mapWithLimit(libs, LIB_CONCURRENCY, async (lib) => {
    let totalSize = 0;
    let itemCount = 0;
    let start = 0;
    for (let guard = 0; guard < MAX_BATCHES; guard++) {
      const params = new URLSearchParams({
        ParentId: lib.id,
        Recursive: "true",
        IncludeItemTypes: "Movie,Episode,Audio",
        Fields: "MediaSources",
        StartIndex: String(start),
        Limit: String(EMBY_PAGE),
      });
      const res = await fetch(`${base}/Items?${params}`, {
        headers: { "X-Emby-Token": token, Accept: "application/json" },
      });
      if (!res.ok) break;
      const data = await res.json();
      const items = data.Items || [];
      const total = Number(data.TotalRecordCount || 0);
      for (const it of items) totalSize += it.MediaSources?.[0]?.Size ?? 0;
      itemCount += items.length;
      if (items.length === 0 || (total > 0 && itemCount >= total)) break;
      start += items.length;
    }
    return { id: String(lib.id), name: lib.name, type: lib.type, itemCount, totalSize };
  }));
}