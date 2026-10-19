import { plexGetLibraries, embyGetLibraries } from "@/lib/auditApi";
import { mapWithLimit } from "@/lib/concurrency";

// Plex and Emby/Jellyfin directory-browse APIs return NO size or date for
// files or folders. The only reliable source is the library index, so we
// pull every indexed file once (size + date + artwork) and roll each file's
// values up through all of its ancestor folders. That gives every folder a
// recursive cumulative size and the latest modification date beneath it.

const infoMapCache = new Map(); // `${platform}:${url}` → { map, ts }
const inFlight = new Map(); // `${platform}:${url}` → Promise
const CACHE_TTL = 10 * 60 * 1000;
const LIB_CONCURRENCY = 3;

// Normalise a path into a comparison key: unify separators, drop trailing
// slashes, and lowercase Windows paths (case-insensitive filesystem).
export function pathKey(p) {
  if (!p) return "";
  const isWindows = /^[a-zA-Z]:/.test(p) || p.includes("\\");
  let k = p.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!k) k = "/";
  return isWindows ? k.toLowerCase() : k;
}

function parentKey(k) {
  const idx = k.lastIndexOf("/");
  if (idx <= 0) return null;
  return k.slice(0, idx);
}

function maxDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) >= new Date(b) ? a : b;
}

async function fetchPlexAllItems(baseUrl, token) {
  const base = baseUrl.replace(/\/$/, "");
  const libs = await plexGetLibraries(base, token);
  const PAGE = 2000;
  const perLib = await mapWithLimit(libs, LIB_CONCURRENCY, async (lib) => {
    const typeParam = lib.type === "show" ? "&type=4" : lib.type === "artist" ? "&type=10" : "";
    const out = [];
    for (let start = 0, guard = 0; guard < 5000; guard++, start += PAGE) {
      const url = `${base}/library/sections/${lib.id}/all?X-Plex-Token=${token}${typeParam}&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${PAGE}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } }).catch(() => null);
      if (!res?.ok) break;
      const meta = (await res.json())?.MediaContainer?.Metadata || [];
      for (const item of meta) {
        const thumb = item.grandparentThumb || item.thumb || null;
        const ts = item.updatedAt || item.addedAt;
        const date = ts ? new Date(ts * 1000).toISOString() : null;
        for (const media of item.Media || []) {
          for (const part of media.Part || []) {
            if (!part.file) continue;
            out.push({
              path: part.file,
              size: Number(part.size) || 0,
              date,
              artwork: thumb ? `${base}${thumb}?X-Plex-Token=${token}` : null,
            });
          }
        }
      }
      if (meta.length < PAGE) break;
    }
    return out;
  });
  return perLib.flat();
}

async function fetchEmbyAllItems(baseUrl, token) {
  const base = baseUrl.replace(/\/$/, "");
  const libs = await embyGetLibraries(base, token);
  const PAGE = 5000;
  const perLib = await mapWithLimit(libs, LIB_CONCURRENCY, async (lib) => {
    const out = [];
    for (let start = 0, guard = 0; guard < 5000; guard++) {
      const params = new URLSearchParams({
        ParentId: lib.id,
        Recursive: "true",
        IncludeItemTypes: "Movie,Episode,Audio,Video,MusicVideo",
        Fields: "Path,MediaSources,DateCreated,DateModified",
        EnableImageTypes: "Primary",
        StartIndex: String(start),
        Limit: String(PAGE),
      });
      const res = await fetch(`${base}/Items?${params}`, { headers: { "X-Emby-Token": token, Accept: "application/json" } }).catch(() => null);
      if (!res?.ok) break;
      const data = await res.json();
      const list = data.Items || [];
      for (const it of list) {
        const sources = it.MediaSources?.length ? it.MediaSources : [{ Path: it.Path, Size: 0 }];
        const imgTag = it.ImageTags?.Primary;
        const artwork = imgTag ? `${base}/Items/${it.Id}/Images/Primary?fillWidth=300&tag=${imgTag}&api_key=${token}` : null;
        const date = it.DateModified || it.DateCreated || null;
        for (const src of sources) {
          const path = src.Path || it.Path;
          if (!path) continue;
          out.push({ path, size: Number(src.Size) || 0, date, artwork });
        }
      }
      start += list.length;
      if (list.length === 0 || start >= (data.TotalRecordCount || 0)) break;
    }
    return out;
  });
  return perLib.flat();
}

async function build(server) {
  const items = server.platform === "plex"
    ? await fetchPlexAllItems(server.url, server.api_key)
    : await fetchEmbyAllItems(server.url, server.api_key);

  const byKey = new Map();
  for (const f of items) {
    const fileKey = pathKey(f.path);
    if (byKey.has(fileKey)) continue; // de-dupe multi-version entries
    byKey.set(fileKey, { size: f.size, date: f.date, artwork: f.artwork, isDir: false });

    let dir = parentKey(fileKey);
    let first = true;
    while (dir) {
      const cur = byKey.get(dir) || { size: 0, date: null, artwork: null, isDir: true };
      cur.size += f.size;
      cur.date = maxDate(cur.date, f.date);
      if (first && !cur.artwork && f.artwork) cur.artwork = f.artwork;
      byKey.set(dir, cur);
      first = false;
      dir = parentKey(dir);
    }
  }
  return { get: (path) => byKey.get(pathKey(path)) || null, fileCount: items.length };
}

export async function buildFolderInfoMap(server) {
  const cacheKey = `${server.platform}:${server.url}`;
  const cached = infoMapCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.map;
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const p = build(server)
    .then((map) => { infoMapCache.set(cacheKey, { map, ts: Date.now() }); return map; })
    .finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, p);
  return p;
}

export function clearFolderInfoMap(server) {
  if (server) infoMapCache.delete(`${server.platform}:${server.url}`);
  else infoMapCache.clear();
}

// Enrich a browse entry with recursive size, latest date, and artwork.
// `metaLoading` = the library index is still being built.
export function mergeEntryInfo(entry, infoMap, metaLoading) {
  const info = infoMap?.get(entry.path);
  const size = info?.size > 0 ? info.size : (Number(entry.size) > 0 ? Number(entry.size) : (entry.isDirectory && infoMap ? 0 : null));
  const dateModified = entry.dateModified || info?.date || null;
  return {
    ...entry,
    size,
    dateModified,
    artwork: info?.artwork || entry.artwork,
    scanning: !!metaLoading && !info,
  };
}