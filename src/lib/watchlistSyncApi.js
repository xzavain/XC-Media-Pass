import { base44 } from "@/api/base44Client";

import { TMDB_API_KEY, TMDB_API_BASE } from "@/lib/tmdbConfig";

const PLEX_CLIENT_ID = "mediapass-app";

// ─── TMDB External ID Resolution ───

async function tmdbFindByExternalId(externalId, externalSource) {
  const url = new URL(`${TMDB_API_BASE}/find/${externalId}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("external_source", externalSource);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

// Resolve a Plex/Emby/Jellyfin external GUID to a TMDB ID + media type
async function resolveToTmdb(guids) {
  // guids: array of { source: 'tmdb'|'imdb'|'tvdb', id: string }
  for (const g of guids) {
    if (g.source === "tmdb" && g.id) {
      // We have a direct TMDB ID but don't know if it's movie or TV.
      // Try both endpoints; return whichever works.
      try {
        const movieRes = await fetch(`${TMDB_API_BASE}/movie/${g.id}?api_key=${TMDB_API_KEY}&language=en-US`);
        if (movieRes.ok) {
          const movie = await movieRes.json();
          return { tmdb_id: movie.id, media_type: "movie", title: movie.title, poster_path: movie.poster_path, release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : null, vote_average: movie.vote_average || 0 };
        }
      } catch {}
      try {
        const tvRes = await fetch(`${TMDB_API_BASE}/tv/${g.id}?api_key=${TMDB_API_KEY}&language=en-US`);
        if (tvRes.ok) {
          const tv = await tvRes.json();
          return { tmdb_id: tv.id, media_type: "tv", title: tv.name, poster_path: tv.poster_path, release_year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : null, vote_average: tv.vote_average || 0 };
        }
      } catch {}
    }
  }
  // Fall back to IMDb / TVDB find endpoint
  for (const g of guids) {
    if (g.source === "imdb" && g.id) {
      try {
        const data = await tmdbFindByExternalId(g.id, "imdb_id");
        if (data?.movie_results?.length > 0) {
          const m = data.movie_results[0];
          return { tmdb_id: m.id, media_type: "movie", title: m.title, poster_path: m.poster_path, release_year: m.release_date ? new Date(m.release_date).getFullYear() : null, vote_average: m.vote_average || 0 };
        }
        if (data?.tv_results?.length > 0) {
          const t = data.tv_results[0];
          return { tmdb_id: t.id, media_type: "tv", title: t.name, poster_path: t.poster_path, release_year: t.first_air_date ? new Date(t.first_air_date).getFullYear() : null, vote_average: t.vote_average || 0 };
        }
      } catch {}
    }
    if (g.source === "tvdb" && g.id) {
      try {
        // TVDB find works for tv_series and movie depending on the source type
        const data = await tmdbFindByExternalId(g.id, "tvdb_id");
        if (data?.tv_results?.length > 0) {
          const t = data.tv_results[0];
          return { tmdb_id: t.id, media_type: "tv", title: t.name, poster_path: t.poster_path, release_year: t.first_air_date ? new Date(t.first_air_date).getFullYear() : null, vote_average: t.vote_average || 0 };
        }
        if (data?.movie_results?.length > 0) {
          const m = data.movie_results[0];
          return { tmdb_id: m.id, media_type: "movie", title: m.title, poster_path: m.poster_path, release_year: m.release_date ? new Date(m.release_date).getFullYear() : null, vote_average: m.vote_average || 0 };
        }
      } catch {}
    }
  }
  return null;
}

// ─── Plex Watchlist Ingestion ───

// Parse Plex Guid field — can be an array of {id: "imdb://tt123"} objects
// or a space-separated string (legacy format)
function parsePlexGuids(guidField) {
  if (!guidField) return [];
  // Array format: [{"id": "imdb://tt7638348"}, {"id": "tmdb://513310"}]
  if (Array.isArray(guidField)) {
    return guidField.map((g) => {
      const match = (g.id || "").match(/^(imdb|tmdb|tvdb):\/\/(.+)$/);
      return match ? { source: match[1], id: match[2] } : null;
    }).filter(Boolean);
  }
  // String format (fallback): "imdb://tt123 tmdb://456 tvdb://789"
  if (typeof guidField === "string") {
    return guidField.split(" ").map((g) => {
      const match = g.match(/^(imdb|tmdb|tvdb):\/\/(.+)$/);
      return match ? { source: match[1], id: match[2] } : null;
    }).filter(Boolean);
  }
  return [];
}

export async function ingestPlexWatchlist(token) {
  if (!token) return { items: [], error: "No Plex auth token" };

  const allRawItems = [];
  let offset = 0;
  const pageSize = 50;
  let totalSize = 0;

  // Paginate through the full watchlist
  for (let page = 0; page < 20; page++) {
    const url = `https://discover.provider.plex.tv/library/sections/watchlist/all?includeGuids=1&offset=${offset}&size=${pageSize}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Plex-Token": token,
        "X-Plex-Client-Identifier": PLEX_CLIENT_ID,
      },
    });
    if (!res.ok) {
      const status = res.status;
      if (status === 401 || status === 403) return { items: [], error: `Plex token invalid or expired (${status})` };
      return { items: [], error: `Plex API returned ${status}` };
    }
    const data = await res.json();
    const metadata = data?.MediaContainer?.Metadata || [];
    totalSize = data?.MediaContainer?.totalSize || 0;
    allRawItems.push(...metadata);
    offset += pageSize;
    if (offset >= totalSize || metadata.length === 0) break;
  }

  const items = [];
  for (const raw of allRawItems) {
    const guids = parsePlexGuids(raw.Guid);
    const resolved = await resolveToTmdb(guids);
    if (resolved) {
      items.push({
        ...resolved,
        source: "plex",
        plex_rating_key: raw.ratingKey,
      });
    }
  }
  return { items, error: null };
}

// ─── Emby Favorites Ingestion ───

function parseEmbyProviderIds(providerIds) {
  if (!providerIds) return [];
  const guids = [];
  if (providerIds.Tmdb) guids.push({ source: "tmdb", id: String(providerIds.Tmdb) });
  if (providerIds.Imdb) guids.push({ source: "imdb", id: providerIds.Imdb });
  if (providerIds.Tvdb) guids.push({ source: "tvdb", id: String(providerIds.Tvdb) });
  return guids;
}

export async function ingestEmbyFavorites(serverUrl, token, userId) {
  if (!serverUrl || !token || !userId) return { items: [], error: "Missing Emby connection parameters" };
  const base = serverUrl.replace(/\/$/, "");
  const url = new URL(`${base}/emby/Users/${userId}/Items`);
  url.searchParams.set("Filters", "IsFavorite");
  url.searchParams.set("Recursive", "true");
  url.searchParams.set("Fields", "ProviderIds,Overview,PremiereDate");
  try {
    const res = await fetch(url.toString(), {
      headers: { "X-Emby-Token": token, Accept: "application/json" },
    });
    if (!res.ok) {
      const status = res.status;
      if (status === 401 || status === 403) return { items: [], error: `Emby token invalid (${status})` };
      return { items: [], error: `Emby API returned ${status}` };
    }
    const data = await res.json();
    const rawItems = data?.Items || [];
    const items = [];
    for (const raw of rawItems) {
      const guids = parseEmbyProviderIds(raw.ProviderIds);
      const resolved = await resolveToTmdb(guids);
      if (resolved) {
        items.push({ ...resolved, source: "emby", emby_item_id: raw.Id });
      }
    }
    return { items, error: null };
  } catch (err) {
    return { items: [], error: `Emby host unreachable: ${err.message}` };
  }
}

// ─── Jellyfin Favorites Ingestion ───

export async function ingestJellyfinFavorites(serverUrl, token, userId) {
  if (!serverUrl || !token || !userId) return { items: [], error: "Missing Jellyfin connection parameters" };
  const base = serverUrl.replace(/\/$/, "");
  const url = new URL(`${base}/Users/${userId}/Items`);
  url.searchParams.set("Filters", "IsFavorite");
  url.searchParams.set("Recursive", "true");
  url.searchParams.set("Fields", "ProviderIds,Overview");
  const authStr = `MediaBrowser Client="Portal", Device="Web", DeviceId="mediapass-app", Version="1.0.0", Token="${token}"`;
  try {
    const res = await fetch(url.toString(), {
      headers: { "X-Emby-Authorization": authStr, Accept: "application/json" },
    });
    if (!res.ok) {
      const status = res.status;
      if (status === 401 || status === 403) return { items: [], error: `Jellyfin token invalid (${status})` };
      return { items: [], error: `Jellyfin API returned ${status}` };
    }
    const data = await res.json();
    const rawItems = data?.Items || [];
    const items = [];
    for (const raw of rawItems) {
      const guids = parseEmbyProviderIds(raw.ProviderIds);
      const resolved = await resolveToTmdb(guids);
      if (resolved) {
        items.push({ ...resolved, source: "jellyfin", jellyfin_item_id: raw.Id });
      }
    }
    return { items, error: null };
  } catch (err) {
    return { items: [], error: `Jellyfin host unreachable: ${err.message}` };
  }
}

// ─── Additive Union Merge (Non-Destructive) ───

export function additiveUnionMerge(existingWatchlist, ingestedItems) {
  const existingKeys = new Set(
    existingWatchlist.map((w) => `${w.tmdb_id}-${w.media_type}`)
  );
  const newItems = [];
  for (const item of ingestedItems) {
    const key = `${item.tmdb_id}-${item.media_type}`;
    if (!existingKeys.has(key)) {
      newItems.push({
        ...item,
        status: "plan_to_watch",
        added_at: new Date().toISOString(),
      });
      existingKeys.add(key);
    }
  }
  // NEVER remove existing items — only append new ones
  return [...existingWatchlist, ...newItems];
}

// ─── Full Inbound Sync Orchestrator ───

export async function runInboundSync(identity, nodes, currentWatchlist) {
  const results = {
    plex: { itemsFound: 0, itemsImported: 0, error: null, status: "skipped" },
    emby: { itemsFound: 0, itemsImported: 0, error: null, status: "skipped" },
    jellyfin: { itemsFound: 0, itemsImported: 0, error: null, status: "skipped" },
    totalImported: 0,
    mergedWatchlist: currentWatchlist,
    timestamp: null,
  };

  const allIngested = [];

  // Plex ingestion
  if (identity?.plex_connected && identity?.plex_auth_token) {
    results.plex.status = "syncing";
    const plexResult = await ingestPlexWatchlist(identity.plex_auth_token);
    if (plexResult.error) {
      results.plex.error = plexResult.error;
      results.plex.status = "error";
    } else {
      results.plex.itemsFound = plexResult.items.length;
      allIngested.push(...plexResult.items);
      results.plex.status = "success";
    }
  }

  // Emby ingestion
  if (identity?.emby_connected && identity?.emby_access_token) {
    const embyNode = nodes.find((n) => n.service_type === "emby");
    if (embyNode?.internal_api_endpoint && identity.emby_user_guid) {
      results.emby.status = "syncing";
      const embyResult = await ingestEmbyFavorites(
        embyNode.internal_api_endpoint,
        identity.emby_access_token,
        identity.emby_user_guid
      );
      if (embyResult.error) {
        results.emby.error = embyResult.error;
        results.emby.status = "error";
      } else {
        results.emby.itemsFound = embyResult.items.length;
        allIngested.push(...embyResult.items);
        results.emby.status = "success";
      }
    } else {
      results.emby.status = "no_server";
      results.emby.error = "No Emby server node configured";
    }
  }

  // Jellyfin ingestion
  if (identity?.jellyfin_connected && identity?.jellyfin_access_token) {
    const jellyfinNode = nodes.find((n) => n.service_type === "jellyfin");
    if (jellyfinNode?.internal_api_endpoint && identity.jellyfin_user_id) {
      results.jellyfin.status = "syncing";
      const jellyfinResult = await ingestJellyfinFavorites(
        jellyfinNode.internal_api_endpoint,
        identity.jellyfin_access_token,
        identity.jellyfin_user_id
      );
      if (jellyfinResult.error) {
        results.jellyfin.error = jellyfinResult.error;
        results.jellyfin.status = "error";
      } else {
        results.jellyfin.itemsFound = jellyfinResult.items.length;
        allIngested.push(...jellyfinResult.items);
        results.jellyfin.status = "success";
      }
    } else {
      results.jellyfin.status = "no_server";
      results.jellyfin.error = "No Jellyfin server node configured";
    }
  }

  // Non-destructive additive merge
  const beforeCount = currentWatchlist.length;
  results.mergedWatchlist = additiveUnionMerge(currentWatchlist, allIngested);
  results.totalImported = results.mergedWatchlist.length - beforeCount;
  results.timestamp = new Date().toISOString();

  // Per-service imported counts
  for (const item of allIngested) {
    const key = `${item.tmdb_id}-${item.media_type}`;
    const wasNew = !currentWatchlist.some((w) => `${w.tmdb_id}-${w.media_type}` === key);
    if (wasNew && results[item.source]) {
      results[item.source].itemsImported++;
    }
  }

  return results;
}

// ─── Connection Test (for diagnostics) ───

export async function testServiceConnection(service, identity, nodes) {
  try {
    if (service === "plex") {
      if (!identity?.plex_connected || !identity?.plex_auth_token) return { status: "not_connected", message: "Plex not linked" };
      const res = await fetch("https://plex.tv/api/v2/user", {
        headers: {
          Accept: "application/json",
          "X-Plex-Token": identity.plex_auth_token,
          "X-Plex-Client-Identifier": PLEX_CLIENT_ID,
        },
      });
      if (res.ok) return { status: "active", message: "Token valid" };
      if (res.status === 401) return { status: "invalid_token", message: "Token expired or revoked" };
      return { status: "error", message: `Plex returned ${res.status}` };
    }
    if (service === "emby") {
      if (!identity?.emby_connected || !identity?.emby_access_token) return { status: "not_connected", message: "Emby not linked" };
      const node = nodes.find((n) => n.service_type === "emby");
      if (!node?.internal_api_endpoint) return { status: "no_server", message: "No Emby node configured" };
      const base = node.internal_api_endpoint.replace(/\/$/, "");
      const res = await fetch(`${base}/System/Info`, { headers: { "X-Emby-Token": identity.emby_access_token } });
      if (res.ok) return { status: "active", message: "Connected" };
      if (res.status === 401 || res.status === 403) return { status: "invalid_token", message: "Token invalid" };
      return { status: "error", message: `Emby returned ${res.status}` };
    }
    if (service === "jellyfin") {
      if (!identity?.jellyfin_connected || !identity?.jellyfin_access_token) return { status: "not_connected", message: "Jellyfin not linked" };
      const node = nodes.find((n) => n.service_type === "jellyfin");
      if (!node?.internal_api_endpoint) return { status: "no_server", message: "No Jellyfin node configured" };
      const base = node.internal_api_endpoint.replace(/\/$/, "");
      const authStr = `MediaBrowser Client="Portal", Device="Web", DeviceId="mediapass-app", Version="1.0.0", Token="${identity.jellyfin_access_token}"`;
      const res = await fetch(`${base}/System/Info`, { headers: { "X-Emby-Authorization": authStr } });
      if (res.ok) return { status: "active", message: "Connected" };
      if (res.status === 401 || res.status === 403) return { status: "invalid_token", message: "Token invalid" };
      return { status: "error", message: `Jellyfin returned ${res.status}` };
    }
    return { status: "unknown", message: "Unknown service" };
  } catch (err) {
    return { status: "unreachable", message: `Host unreachable: ${err.message}` };
  }
}

// ─── Outward Write-Back (DISABLED by default — isolated until inbound verified) ───

export const WRITEBACK_ENABLED = false;

export async function appendToPlexWatchlist(tmdbId, plexToken) {
  if (!WRITEBACK_ENABLED) throw new Error("Write-back is disabled until inbound sync is verified");
  if (!plexToken) throw new Error("No Plex token");
  // Resolve TMDB ID to Plex ratingKey via metadata matches
  const matchRes = await fetch(
    `https://discover.provider.plex.tv/library/metadata/matches?guid=tmdb://${tmdbId}`,
    { headers: { Accept: "application/json", "X-Plex-Token": plexToken, "X-Plex-Client-Identifier": PLEX_CLIENT_ID } }
  );
  if (!matchRes.ok) throw new Error(`Plex match lookup failed: ${matchRes.status}`);
  const matchData = await matchRes.json();
  const ratingKey = matchData?.MediaContainer?.Metadata?.[0]?.ratingKey;
  if (!ratingKey) throw new Error("Could not resolve Plex ratingKey for this item");
  const addRes = await fetch(
    `https://discover.provider.plex.tv/actions/addToWatchlist?ratingKey=${ratingKey}`,
    { method: "PUT", headers: { Accept: "application/json", "X-Plex-Token": plexToken, "X-Plex-Client-Identifier": PLEX_CLIENT_ID } }
  );
  if (!addRes.ok) throw new Error(`Plex add to watchlist failed: ${addRes.status}`);
  return true;
}

export async function appendToEmbyFavorites(serverUrl, token, userId, itemId) {
  if (!WRITEBACK_ENABLED) throw new Error("Write-back is disabled until inbound sync is verified");
  const base = (serverUrl || "").replace(/\/$/, "");
  const res = await fetch(`${base}/Users/${userId}/FavoriteItems/${itemId}`, {
    method: "POST",
    headers: { "X-Emby-Token": token },
  });
  if (!res.ok) throw new Error(`Emby favorite append failed: ${res.status}`);
  return true;
}

export async function appendToJellyfinFavorites(serverUrl, token, userId, itemId) {
  if (!WRITEBACK_ENABLED) throw new Error("Write-back is disabled until inbound sync is verified");
  const base = (serverUrl || "").replace(/\/$/, "");
  const authStr = `MediaBrowser Client="Portal", Device="Web", DeviceId="mediapass-app", Version="1.0.0", Token="${token}"`;
  const res = await fetch(`${base}/Users/${userId}/FavoriteItems/${itemId}`, {
    method: "POST",
    headers: { "X-Emby-Authorization": authStr },
  });
  if (!res.ok) throw new Error(`Jellyfin favorite append failed: ${res.status}`);
  return true;
}

// ─── Single-Item Removal (explicit, never bulk) ───

export async function removeFromPlexWatchlist(ratingKey, plexToken) {
  if (!plexToken || !ratingKey) throw new Error("Missing Plex token or rating key");
  const res = await fetch(
    `https://discover.provider.plex.tv/actions/removeFromWatchlist?ratingKey=${ratingKey}`,
    { method: "PUT", headers: { Accept: "application/json", "X-Plex-Token": plexToken, "X-Plex-Client-Identifier": PLEX_CLIENT_ID } }
  );
  if (!res.ok) throw new Error(`Plex remove from watchlist failed: ${res.status}`);
  return true;
}

export async function removeFromEmbyFavorites(serverUrl, token, userId, itemId) {
  const base = (serverUrl || "").replace(/\/$/, "");
  const res = await fetch(`${base}/Users/${userId}/FavoriteItems/${itemId}`, {
    method: "DELETE",
    headers: { "X-Emby-Token": token },
  });
  if (!res.ok) throw new Error(`Emby un-favorite failed: ${res.status}`);
  return true;
}

export async function removeFromJellyfinFavorites(serverUrl, token, userId, itemId) {
  const base = (serverUrl || "").replace(/\/$/, "");
  const authStr = `MediaBrowser Client="Portal", Device="Web", DeviceId="mediapass-app", Version="1.0.0", Token="${token}"`;
  const res = await fetch(`${base}/Users/${userId}/FavoriteItems/${itemId}`, {
    method: "DELETE",
    headers: { "X-Emby-Authorization": authStr },
  });
  if (!res.ok) throw new Error(`Jellyfin un-favorite failed: ${res.status}`);
  return true;
}