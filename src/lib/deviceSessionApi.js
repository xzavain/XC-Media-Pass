import { PlexAPI, EmbyAPI, JellyfinAPI } from "@/lib/mediaServerApi";
import { getLocation } from "@/lib/geoApi";

// Convert a 2-letter country code to a flag emoji
export function countryFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...countryCode.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0))
  );
}

// Fetch live sessions for a linked account, normalized to a common shape
export async function fetchAccountSessions(account) {
  const base = (account.server_url || "").replace(/\/$/, "");
  if (!base) return [];

  if (account.service_type === "plex") {
    try {
      const raw = await PlexAPI.getSessions(base, account.auth_token);
      return normalizePlex(raw, base, account);
    } catch { return []; }
  }

  const api = account.service_type === "emby" ? EmbyAPI : JellyfinAPI;
  try {
    const raw = await api.getSessions(base, account.auth_token);
    return normalizeEmbyJellyfin(raw, base, account);
  } catch { return []; }
}

function normalizePlex(raw, baseUrl, account) {
  return (Array.isArray(raw) ? raw : []).map((s) => {
    const runtime = Number(s.duration || 0);
    const position = Number(s.viewOffset || 0);
    const media = (s.Media && s.Media[0]) || {};
    return {
      session_key: String(s.sessionKey || s.Session?.id || s.ratingKey),
      service_type: "plex",
      server_id: account.server_id,
      device_name: s.Player?.title || s.Player?.device || "Unknown",
      client_app: s.Player?.product || "",
      client_version: s.Player?.version || "",
      ip_address: s.Player?.address || "",
      playback_state: s.Player?.state === "paused" ? "paused" : "playing",
      media_title: s.grandparentTitle ? `${s.grandparentTitle} - ${s.title}` : (s.title || "Unknown"),
      media_type: s.type === "episode" ? "Episode" : s.type === "movie" ? "Movie" : "LiveTV",
      poster_url: (s.grandparentThumb || s.thumb) ? `${baseUrl}${s.grandparentThumb || s.thumb}?X-Plex-Token=${account.auth_token}` : null,
      media_year: s.year || null,
      resolution_badge: media.videoResolution ? `${media.videoResolution}p` : "",
      duration_ms: runtime,
      view_offset_ms: position,
      progress_percent: runtime ? Math.round((position / runtime) * 100) : 0,
      bitrate: Number(s.Session?.bandwidth || 0),
      video_codec: (media.videoCodec || "").toUpperCase(),
    };
  });
}

function normalizeEmbyJellyfin(raw, baseUrl, account) {
  return (Array.isArray(raw) ? raw : [])
    .filter((s) => !account.external_user_id || s.UserId === account.external_user_id)
    .map((s) => {
      const item = s.NowPlayingItem || {};
      const isActive = !!s.NowPlayingItem;
      const positionTicks = s.PlayState?.PositionTicks || 0;
      const runtimeTicks = item.RunTimeTicks || 0;
      const videoStream = (item.MediaStreams || []).find((m) => m.Type === "Video") || {};
      const posterId = item.SeriesId || item.Id;
      const posterTag = item.SeriesId ? (item.SeriesPrimaryImageTag || "") : (item.ImageTags?.Primary || "");
      return {
        session_key: String(s.Id || s.PlaySessionId || `${s.UserId}-${item.Id || "idle"}`),
        service_type: account.service_type,
        server_id: account.server_id,
        device_name: s.DeviceName || "Unknown device",
        client_app: s.Client || "",
        client_version: s.ApplicationVersion || "",
        ip_address: s.RemoteEndPoint || "",
        playback_state: isActive ? (s.PlayState?.IsPaused ? "paused" : "playing") : "idle",
        media_title: isActive ? (item.SeriesName ? `${item.SeriesName} - ${item.Name}` : item.Name || "Unknown") : "Idle — No active playback",
        media_type: item.Type === "Episode" ? "Episode" : item.Type === "Movie" ? "Movie" : "LiveTV",
        poster_url: posterId ? `${baseUrl}/Items/${posterId}/Images/Primary?fillWidth=400${posterTag ? `&tag=${posterTag}` : ""}&api_key=${account.auth_token}` : null,
        media_year: item.ProductionYear || null,
        resolution_badge: videoStream.Height ? (videoStream.Height >= 2160 ? "4K" : `${videoStream.Height}p`) : "",
        duration_ms: Math.round(runtimeTicks / 10000),
        view_offset_ms: Math.round(positionTicks / 10000),
        progress_percent: runtimeTicks ? Math.round((positionTicks / runtimeTicks) * 100) : 0,
        bitrate: Math.round((s.TranscodingInfo?.Bitrate || 0) / 1000),
        video_codec: (s.TranscodingInfo?.VideoCodec || videoStream.Codec || "").toUpperCase(),
      };
    });
}

// Enrich sessions with geo data (best-effort, non-blocking)
export async function enrichWithGeo(sessions) {
  return Promise.all(
    sessions.map(async (s) => {
      if (!s.ip_address) return s;
      try {
        const loc = await getLocation(s.ip_address);
        if (loc) {
          return { ...s, geo_country: loc.country_code, geo_city: loc.city, geo_flag_emoji: countryFlagEmoji(loc.country_code) };
        }
      } catch {}
      return s;
    })
  );
}

// Kill a device session via the platform adapter
export async function killDeviceSession(account, sessionKey, reason) {
  const base = (account.server_url || "").replace(/\/$/, "");
  if (account.service_type === "plex") {
    return PlexAPI.terminateSession(base, account.auth_token, sessionKey, reason);
  }
  const api = account.service_type === "emby" ? EmbyAPI : JellyfinAPI;
  if (reason) {
    await api.sendMessage(base, account.auth_token, sessionKey, reason).catch(() => {});
  }
  return api.stopSession(base, account.auth_token, sessionKey);
}

// Reset Emby/Jellyfin password
export async function resetMediaPassword(account, newPassword) {
  const base = (account.server_url || "").replace(/\/$/, "");
  const api = account.service_type === "emby" ? EmbyAPI : JellyfinAPI;
  return api.resetPassword(base, account.auth_token, account.external_user_id, newPassword);
}

// Revoke Plex auth token (nuclear option)
export async function revokePlexToken(token) {
  const res = await fetch(`https://plex.tv/api/v2/tokens/${token}`, {
    method: "DELETE",
    headers: {
      "X-Plex-Token": token,
      "Accept": "application/json",
      "X-Plex-Product": "MediaPass",
      "X-Plex-Version": "1.0",
      "X-Plex-Client-Identifier": "mediapass-app",
    },
  });
  if (!res.ok) throw new Error("Failed to revoke Plex token");
}

// Revoke all Jellyfin device tokens (force re-login on all devices)
export async function revokeAllJellyfinTokens(account) {
  const base = (account.server_url || "").replace(/\/$/, "");
  const res = await fetch(`${base}/Sessions?UserId=${account.external_user_id}`, {
    method: "DELETE",
    headers: { "X-Emby-Token": account.auth_token },
  });
  if (!res.ok) throw new Error("Failed to revoke device tokens");
}

// Simple password strength score (0-4)
export function passwordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

// Format milliseconds as HH:MM:SS
export function formatRuntime(ms) {
  if (!ms) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}