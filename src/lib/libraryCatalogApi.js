/**
 * Unified Library Catalog API
 * Fetches and normalizes movies/shows from all connected media servers
 * (Plex, Emby, Jellyfin) into a single deduplicated catalog with server indicators.
 */

import { base44 } from "@/api/base44Client";
import { PlexAPI, EmbyAPI, JellyfinAPI } from "@/lib/mediaServerApi";

// ─── Per-platform item fetchers ───

async function fetchPlexLibrary(server, library) {
  const base = server.url.replace(/\/$/, "");
  const res = await fetch(`${base}/library/sections/${library.id}/all?X-Plex-Token=${server.api_key}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Plex library "${library.name}" fetch failed`);
  const data = await res.json();
  const metadata = data?.MediaContainer?.Metadata || [];
  return metadata.map((item) => ({
    title: item.title,
    year: item.year ? Number(item.year) : null,
    summary: item.summary || "",
    content_type: item.type === "show" ? "show" : "movie",
    poster_url: item.thumb ? `${base}${item.thumb}?X-Plex-Token=${server.api_key}` : null,
    duration_ms: item.duration ? Number(item.duration) : null,
    rating: item.rating ? Number(item.rating) : null,
    genres: item.Genre ? (Array.isArray(item.Genre) ? item.Genre.map((g) => g.tag) : [item.Genre.tag]) : [],
    external_id: `plex:${item.ratingKey}`,
    server_id: server.id,
    server_name: server.name,
    platform: "plex",
    library_name: library.name,
  }));
}

async function fetchEmbyJellyfinLibrary(server, library, platform) {
  const base = server.url.replace(/\/$/, "");
  const headers = platform === "emby"
    ? { "X-Emby-Token": server.api_key, Accept: "application/json" }
    : { "X-Emby-Token": server.api_key, Accept: "application/json" };

  const res = await fetch(
    `${base}/Items?ParentId=${library.id}&Recursive=true&IncludeItemTypes=Movie,Series&Fields=Overview,Genres&Limit=5000`,
    { headers }
  );
  if (!res.ok) throw new Error(`${platform} library "${library.name}" fetch failed`);
  const data = await res.json();
  const items = data.Items || [];

  return items.map((item) => {
    const imgTag = item.ImageTags?.Primary;
    const posterUrl = imgTag
      ? `${base}/Items/${item.Id}/Images/Primary?tag=${imgTag}&quality=90`
      : null;
    return {
      title: item.Name,
      year: item.ProductionYear ? Number(item.ProductionYear) : null,
      summary: item.Overview || "",
      content_type: item.Type === "Series" ? "show" : "movie",
      poster_url: posterUrl,
      duration_ms: item.RunTimeTicks ? Number(item.RunTimeTicks) / 10000 : null,
      rating: item.CommunityRating ? Number(item.CommunityRating) : null,
      genres: item.Genres || [],
      external_id: `${platform}:${item.Id}`,
      server_id: server.id,
      server_name: server.name,
      platform,
      library_name: library.name,
    };
  });
}

// ─── Unified fetch from all servers ───

export async function fetchUnifiedCatalog() {
  const servers = await base44.entities.MediaServer.list();
  const results = [];
  const errors = [];

  await Promise.all(
    servers.map(async (server) => {
      const libraries = server.libraries || [];
      if (!libraries.length) return;

      await Promise.all(
        libraries.map(async (lib) => {
          try {
            let items = [];
            if (server.platform === "plex") {
              items = await fetchPlexLibrary(server, lib);
            } else if (server.platform === "emby") {
              items = await fetchEmbyJellyfinLibrary(server, lib, "emby");
            } else if (server.platform === "jellyfin") {
              items = await fetchEmbyJellyfinLibrary(server, lib, "jellyfin");
            }
            results.push(...items);
          } catch (err) {
            errors.push({ server: server.name, library: lib.name, error: err.message });
          }
        })
      );
    })
  );

  return { items: results, errors };
}

// ─── Deduplication: merge items that appear on multiple servers ───

export function deduplicateCatalog(items) {
  // Group by normalized title + year as the dedup key
  const groups = new Map();
  for (const item of items) {
    const key = `${item.title.toLowerCase().trim()}|${item.year || ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const merged = [];
  for (const [, group] of groups) {
    // Pick the richest item as the "primary" (most fields filled)
    const primary = group.reduce((best, item) => {
      const score = (item) =>
        (item.summary ? 1 : 0) + (item.poster_url ? 1 : 0) + (item.rating ? 1 : 0) + (item.genres?.length ? 1 : 0);
      return score(item) > score(best) ? item : best;
    }, group[0]);

    merged.push({
      ...primary,
      servers: group.map((g) => ({
        server_id: g.server_id,
        server_name: g.server_name,
        platform: g.platform,
        library_name: g.library_name,
      })),
      server_count: group.length,
    });
  }

  // Sort alphabetically
  merged.sort((a, b) => a.title.localeCompare(b.title));
  return merged;
}