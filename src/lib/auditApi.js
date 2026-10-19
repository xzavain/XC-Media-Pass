/**
 * READ-ONLY audit API utilities for Plex and Emby.
 * All requests are GET-only — no mutations of any kind.
 */

// In-memory caches to avoid re-fetching the same data on repeated views.
const plexSectionCache = new Map(); // key: `${base}:${sectionId}` → { itemByPath, ts }
const SECTION_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const embyPropsCache = new Map(); // key: `emby:${base}:${path}` → { info, ts }
const PROPS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ---------- EMBY / JELLYFIN ----------

export async function embyGetLibraries(baseUrl, token) {
  const url = `${baseUrl.replace(/\/$/, "")}/Library/VirtualFolders`;
  const res = await fetch(url, {
    headers: { "X-Emby-Token": token, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Emby libraries failed: ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((f) => ({
    id: f.ItemId,
    name: f.Name,
    type: f.CollectionType || "unknown",
  }));
}

export async function embyGetItems(baseUrl, token, libraryId, { search = "", startIndex = 0, limit = 200 } = {}) {
  const params = new URLSearchParams({
    ParentId: libraryId,
    Fields: "Path,MediaSources,OriginalTitle,DateCreated",
    Recursive: "true",
    IncludeItemTypes: "Movie,Episode,Audio",
    StartIndex: String(startIndex),
    Limit: String(limit),
    ...(search ? { SearchTerm: search } : {}),
  });
  const url = `${baseUrl.replace(/\/$/, "")}/Items?${params}`;
  const res = await fetch(url, {
    headers: { "X-Emby-Token": token, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Emby items failed: ${res.status}`);
  const data = await res.json();
  return {
    items: (data.Items || []).map((item) => ({
      id: item.Id,
      name: item.Name,
      type: item.Type,
      path: item.Path || "",
      size: item.MediaSources?.[0]?.Size ?? null,
      dateCreated: item.DateCreated,
    })),
    total: data.TotalRecordCount || 0,
  };
}

// ---------- PLEX ----------

export async function plexGetLibraries(baseUrl, token) {
  const url = `${baseUrl.replace(/\/$/, "")}/library/sections?X-Plex-Token=${token}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Plex libraries failed: ${res.status}`);
  const data = await res.json();
  const sections = data?.MediaContainer?.Directory ?? [];
  return sections.map((s) => ({
    id: s.key,
    name: s.title,
    type: s.type,
  }));
}

export async function plexGetItems(baseUrl, token, libraryId, { search = "" } = {}) {
  const endpoint = search
    ? `/library/sections/${libraryId}/search?query=${encodeURIComponent(search)}&X-Plex-Token=${token}`
    : `/library/sections/${libraryId}/all?X-Plex-Token=${token}`;
  const url = `${baseUrl.replace(/\/$/, "")}${endpoint}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Plex items failed: ${res.status}`);
  const data = await res.json();
  const raw = data?.MediaContainer?.Metadata ?? data?.MediaContainer?.Video ?? [];
  const items = raw.map((item) => {
    const media = item.Media?.[0];
    const part = media?.Part?.[0];
    return {
      id: item.ratingKey,
      name: item.title,
      type: item.type,
      path: part?.file || "",
      size: part?.size ?? null,
      dateCreated: item.addedAt ? new Date(item.addedAt * 1000).toISOString() : null,
    };
  });
  return { items, total: items.length };
}

// ---------- FILE SYSTEM BROWSING ----------

/**
 * Emby/Jellyfin: Browse a directory path on the server.
 * Uses the /Environment/DirectoryContents endpoint (read-only GET).
 */
export async function embyBrowseDirectory(baseUrl, token, path = "") {
  const params = new URLSearchParams({ IncludeFiles: "true", IncludeDirectories: "true" });
  if (path) params.set("path", path);
  const url = `${baseUrl.replace(/\/$/, "")}/Environment/DirectoryContents?${params}`;
  const res = await fetch(url, {
    headers: { "X-Emby-Token": token, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Browse failed (${res.status}): ${baseUrl}`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : (data?.Items ?? []);
  const entries = items.map((entry) => ({
    name: entry.Name ?? entry.FileName ?? "",
    path: entry.Path ?? entry.FullName ?? "",
    isDirectory: entry.IsDirectory === true || entry.Type === "Directory" || entry.FileType === "Directory",
    size: entry.Size ?? entry.Length ?? null,
    dateModified: entry.DateModified ?? entry.LastWriteTimeUtc ?? null,
  }));

  return entries;
}

/**
 * Emby/Jellyfin: Look up full technical media info (container, bitrate,
 * resolution, codecs) for a file by its exact filesystem path.
 * Returns null if the file isn't indexed in any library.
 */
export async function embyGetFileProperties(baseUrl, token, path) {
  const propsKey = `emby:${baseUrl}:${path}`;
  const cached = embyPropsCache.get(propsKey);
  if (cached && Date.now() - cached.ts < PROPS_CACHE_TTL) return cached.info;
  const params = new URLSearchParams({
    Path: path,
    Fields: "Path,MediaSources,DateCreated",
    Recursive: "true",
    Limit: "1",
  });
  const url = `${baseUrl.replace(/\/$/, "")}/Items?${params}`;
  const res = await fetch(url, {
    headers: { "X-Emby-Token": token, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const item = data?.Items?.[0];
  if (!item) return null;
  const source = item.MediaSources?.[0];
  const videoStream = source?.MediaStreams?.find((s) => s.Type === "Video");
  const audioStream = source?.MediaStreams?.find((s) => s.Type === "Audio");
  const result = {
    title: item.Name,
    container: source?.Container ?? null,
    size: source?.Size ?? null,
    bitrate: source?.Bitrate ?? null,
    duration: item.RunTimeTicks ? item.RunTimeTicks / 10000 : null, // -> ms
    dateModified: item.DateModified ?? item.DateCreated ?? null,
    video: videoStream
      ? {
          codec: videoStream.Codec,
          width: videoStream.Width,
          height: videoStream.Height,
          resolution:
            videoStream.DisplayTitle ||
            (videoStream.Width && videoStream.Height ? `${videoStream.Width}x${videoStream.Height}` : null),
          frameRate: videoStream.RealFrameRate || videoStream.AverageFrameRate,
        }
      : null,
    audio: audioStream
      ? {
          codec: audioStream.Codec,
          channels: audioStream.Channels,
          language: audioStream.Language,
        }
      : null,
  };
  embyPropsCache.set(propsKey, { info: result, ts: Date.now() });
  return result;
}

/**
 * Emby/Jellyfin: Get the top-level drives/roots available on the server.
 */
export async function embyGetDrives(baseUrl, token) {
  const url = `${baseUrl.replace(/\/$/, "")}/Environment/Drives`;
  const res = await fetch(url, {
    headers: { "X-Emby-Token": token, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Drives failed: ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((d) => ({
    name: d.Name,
    path: d.Path,
    isDirectory: true,
    size: null,
    dateModified: null,
  }));
}

/**
 * Emby/Jellyfin: Get the library root folders (the actual storage paths).
 */
export async function embyGetLibraryPaths(baseUrl, token) {
  const url = `${baseUrl.replace(/\/$/, "")}/Library/VirtualFolders`;
  const res = await fetch(url, {
    headers: { "X-Emby-Token": token, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Library paths failed: ${res.status}`);
  const data = await res.json();
  // Each virtual folder has Locations[] — real disk paths
  const roots = [];
  for (const folder of (Array.isArray(data) ? data : [])) {
    for (const loc of (folder.Locations || [])) {
      roots.push({
        name: `${folder.Name} — ${loc}`,
        path: loc,
        isDirectory: true,
        libraryName: folder.Name,
        size: null,
        dateModified: null,
      });
    }
  }
  return roots;
}

/**
 * Plex: Browse a directory path on the server's filesystem.
 * Uses the /services/browse endpoint (the same read-only GET the Plex Web UI
 * uses when picking library folders). Path is base64-encoded per Plex's API.
 */
export async function plexBrowseDirectory(baseUrl, token, path = "") {
  const base = baseUrl.replace(/\/$/, "");
  const encodedPath = path ? encodeURIComponent(btoa(unescape(encodeURIComponent(path)))) : "";
  const key = path ? `/services/browse/${encodedPath}` : "/services/browse";
  const url = `${base}${key}?includeFiles=1&X-Plex-Token=${token}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Plex browse failed (${res.status}): ${baseUrl}`);
  const data = await res.json();
  // With includeFiles=1, Plex returns subfolders in MediaContainer.Path and
  // files in MediaContainer.File (MediaContainer.Directory is never populated).
  const dirs = data?.MediaContainer?.Path ?? [];
  const files = data?.MediaContainer?.File ?? [];
  const toEntry = (n, isDirectory) => ({
    name: n.title || (n.path || "").split(/[\\/]/).filter(Boolean).pop() || "",
    path: n.path || "",
    isDirectory,
    size: n.size ?? null,
    dateModified: null,
  });
  const entries = [...dirs.map((d) => toEntry(d, true)), ...files.map((f) => toEntry(f, false))];

  return entries;
}

/**
 * Plex: Fill in file sizes for browse entries by fetching the matching library
 * section once and mapping path -> size. Mutates entries in place. Designed to
 * run in the background so the folder listing renders immediately.
 */
export async function plexEnrichFileSizes(baseUrl, token, entries, libraryRoots = []) {
  const base = baseUrl.replace(/\/$/, "");
  const sizelessFiles = entries.filter((e) => !e.isDirectory && e.size == null);
  if (!sizelessFiles.length || !libraryRoots?.length) return;
  const bySection = new Map();
  for (const fe of sizelessFiles) {
    const root = libraryRoots
      .filter((r) => r.sectionId && fe.path.startsWith(r.path))
      .sort((a, b) => b.path.length - a.path.length)[0];
    if (!root) continue;
    if (!bySection.has(root.sectionId)) bySection.set(root.sectionId, { root, files: [] });
    bySection.get(root.sectionId).files.push(fe);
  }
  await Promise.all([...bySection.values()].map(async ({ root, files }) => {
    try {
      const typeParam = root.sectionType === "show" ? "&type=4" : root.sectionType === "artist" ? "&type=10" : "";
      const sUrl = `${base}/library/sections/${root.sectionId}/all?X-Plex-Token=${token}${typeParam}`;
      const sRes = await fetch(sUrl, { headers: { Accept: "application/json" } });
      if (!sRes.ok) return;
      const d = await sRes.json();
      const sizeByPath = new Map();
      for (const item of (d?.MediaContainer?.Metadata || [])) {
        for (const media of (item.Media || [])) {
          for (const part of (media.Part || [])) {
            if (part.file && part.size != null) sizeByPath.set(part.file, part.size);
          }
        }
      }
      for (const fe of files) {
        const s = sizeByPath.get(fe.path);
        if (s != null) fe.size = s;
      }
    } catch { /* section lookup failed — sizes stay unknown */ }
  }));
}

/**
 * Plex: Get the library root folders (the actual storage paths), including
 * the section id/type so files under them can be matched back to a library.
 */
export async function plexGetLibraryPaths(baseUrl, token) {
  const url = `${baseUrl.replace(/\/$/, "")}/library/sections?X-Plex-Token=${token}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Plex libraries failed: ${res.status}`);
  const data = await res.json();
  const sections = data?.MediaContainer?.Directory ?? [];
  const roots = [];
  for (const s of sections) {
    for (const loc of (s.Location || [])) {
      roots.push({
        name: `${s.title} — ${loc.path}`,
        path: loc.path,
        isDirectory: true,
        libraryName: s.title,
        sectionId: s.key,
        sectionType: s.type,
        size: null,
        dateModified: null,
      });
    }
  }
  return roots;
}

/**
 * Plex: Find the library item matching a file path within a given section,
 * returning full technical media info (container, bitrate, resolution, codecs).
 * Returns null if no match is found.
 */
export async function plexFindItemByPath(baseUrl, token, sectionId, sectionType, path) {
  const base = baseUrl.replace(/\/$/, "");
  const sectionKey = `${base}:${sectionId}`;
  let cached = plexSectionCache.get(sectionKey);
  if (!cached || Date.now() - cached.ts > SECTION_CACHE_TTL) {
    const typeParam = sectionType === "show" ? "&type=4" : sectionType === "artist" ? "&type=10" : "";
    const url = `${base}/library/sections/${sectionId}/all?X-Plex-Token=${token}${typeParam}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const itemByPath = new Map();
    for (const item of (data?.MediaContainer?.Metadata || [])) {
      for (const media of (item.Media || [])) {
        for (const part of (media.Part || [])) {
          if (!part.file) continue;
          itemByPath.set(part.file, {
            title: item.title,
            container: media.container || part.container || null,
            size: part.size ?? null,
            bitrate: media.bitrate ?? null,
            duration: item.duration ?? null,
            video: media.videoCodec
              ? {
                  codec: media.videoCodec,
                  width: media.width,
                  height: media.height,
                  resolution: media.videoResolution,
                  frameRate: media.videoFrameRate,
                }
              : null,
            audio: media.audioCodec
              ? { codec: media.audioCodec, channels: media.audioChannels }
              : null,
          });
        }
      }
    }
    cached = { itemByPath, ts: Date.now() };
    plexSectionCache.set(sectionKey, cached);
  }
  return cached.itemByPath.get(path) || null;
}

// ---------- HELPERS ----------

export function detectIssues(path) {
  if (!path) return ["missing-path"];
  const issues = [];
  if (/[^\x20-\x7E]/.test(path)) issues.push("non-ascii");
  if (/[<>:"|?*]/.test(path)) issues.push("invalid-chars");
  if (path.startsWith("\\\\") || path.startsWith("//")) issues.push("network-path");
  return issues;
}