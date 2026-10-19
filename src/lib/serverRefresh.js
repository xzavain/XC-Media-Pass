import { base44 } from "@/api/base44Client";
import { getApiForPlatform } from "@/lib/mediaServerApi";

/**
 * Re-tests a media server connection, re-fetches its libraries, and
 * updates the MediaServer record with fresh status + libraries + last_synced.
 * Returns the updated server object (without re-fetching from the DB).
 */
// "Failed to fetch" hides the real cause. An opaque no-cors probe tells us
// whether this browser can reach the host at all (network/DNS/firewall/extension)
// or whether the host is reachable but the CORS handshake is being refused.
async function diagnoseNetworkFailure(url) {
  if (window.location.protocol === "https:" && url.startsWith("http://")) {
    return "Blocked as mixed content — the server URL must use https://";
  }
  try {
    await fetch(`${url}/identity`, { mode: "no-cors", cache: "no-store" });
    return "Host is reachable, but your browser refused the cross-origin response (CORS/preflight). Check the server's reverse proxy CORS settings.";
  } catch {
    return `Your browser cannot reach ${new URL(url).host} at all — likely a firewall/IP block on the server, a DNS issue, or a browser extension (ad/tracker blocker) blocking this domain.`;
  }
}

// Browsers block http:// calls from this https app (mixed content). Plex issues
// every server a secure *.plex.direct address — look it up via plex.tv.
async function resolvePlexHttpsUrl(url, token) {
  const res = await fetch(
    `https://plex.tv/api/v2/resources?includeHttps=1&X-Plex-Token=${token}&X-Plex-Client-Identifier=xcmediapass`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return null;
  const { hostname, port } = new URL(url);
  const dashed = hostname.replace(/\./g, "-");
  for (const r of await res.json()) {
    const match = (r.connections || []).find(
      (c) => c.uri.startsWith("https://") && c.uri.includes(dashed) && (!port || c.uri.endsWith(`:${port}`))
    );
    if (match) return match.uri;
  }
  return null;
}

export async function refreshServer(server) {
  // Always re-fetch the latest record so we test the current URL/token,
  // not a stale copy the caller may still hold in memory (e.g. after the
  // URL was corrected from http:// to https:// out-of-band).
  const latest = await base44.entities.MediaServer.get(server.id);
  const api = getApiForPlatform(latest.platform);
  let url = (latest.url || "").replace(/\/$/, "");
  const token = latest.api_key;
  const extra = {};

  if (latest.platform === "plex" && url.startsWith("http://") && window.location.protocol === "https:") {
    const secure = await resolvePlexHttpsUrl(url, token).catch(() => null);
    if (secure) {
      url = secure;
      extra.url = secure;
    }
  }

  let status = "connected";
  let libraries = latest.libraries || [];
  let error = null;

  try {
    await api.testConnection(url, token);
  } catch (err) {
    status = "error";
    error = err instanceof TypeError ? await diagnoseNetworkFailure(url) : (err.message || "Connection failed");
  }

  if (status === "connected") {
    try {
      const fresh = await api.getLibraries(url, token);
      if (Array.isArray(fresh) && fresh.length) libraries = fresh;
    } catch (err) {
      // Connection works but libraries fetch failed — keep existing libraries
      console.error(`Library refresh failed for ${latest.name}`, err);
    }
  }

  const updated = await base44.entities.MediaServer.update(latest.id, {
    ...extra,
    status,
    libraries,
    last_synced: new Date().toISOString(),
  });

  return { server: updated, status, error, libraryCount: libraries.length };
}