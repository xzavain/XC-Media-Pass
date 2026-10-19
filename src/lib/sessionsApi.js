import { JellyfinAPI, EmbyAPI, PlexAPI } from "@/lib/mediaServerApi";

function apiFor(server) {
  if (server.platform === "plex") return PlexAPI;
  return server.platform === "emby" ? EmbyAPI : JellyfinAPI;
}

function normalizeJellyfinEmby(server, raw) {
  return (Array.isArray(raw) ? raw : [])
    .filter((s) => s.NowPlayingItem)
    .map((s) => {
      const item = s.NowPlayingItem || {};
      const positionTicks = s.PlayState?.PositionTicks || 0;
      const runtimeTicks = item.RunTimeTicks || 0;
      const streams = item.MediaStreams || [];
      const videoStream = streams.find((m) => m.Type === "Video") || {};
      const audioStream = streams.find((m) => m.Type === "Audio") || {};
      const subtitleStream = streams.find((m) => m.Type === "Subtitle" && m.Index === s.PlayState?.SubtitleStreamIndex);
      const base = server.url.replace(/\/$/, "");
      const posterId = item.SeriesId || item.Id;
      const posterTag = item.SeriesId ? (item.SeriesPrimaryImageTag || "") : (item.ImageTags?.Primary || "");
      const artwork_url = posterId
        ? `${base}/Items/${posterId}/Images/Primary?fillWidth=400${posterTag ? `&tag=${posterTag}` : ""}&api_key=${server.api_key}`
        : null;
      return {
        server_id: server.id,
        server_name: server.name,
        platform: server.platform,
        artwork_url,
        session_key: String(s.Id || s.PlaySessionId || `${s.UserId}-${item.Id}`),
        play_session_id: s.PlaySessionId ? String(s.PlaySessionId) : null,
        username: s.UserName || "Unknown",
        title: item.SeriesName ? `${item.SeriesName} - ${item.Name}` : (item.Name || "Unknown"),
        device: s.DeviceName || "Unknown device",
        player: s.Client || "",
        ip_address: s.RemoteEndPoint || "",
        state: s.PlayState?.IsPaused ? "paused" : "playing",
        transcode_decision: s.TranscodingInfo ? "transcode" : "direct play",
        progress_percent: runtimeTicks ? Math.round((positionTicks / runtimeTicks) * 100) : 0,
        bitrate: Math.round((s.TranscodingInfo?.Bitrate || 0) / 1000),
        video_codec: (s.TranscodingInfo?.VideoCodec || videoStream.Codec || "").toUpperCase(),
        audio_codec: (s.TranscodingInfo?.AudioCodec || audioStream.Codec || "").toUpperCase(),
        resolution: videoStream.Height ? `${videoStream.Width}x${videoStream.Height}` : "",
        container: s.TranscodingInfo?.Container || item.Container || "",
        audio_channels: audioStream.Channels || null,
        subtitle: subtitleStream ? (subtitleStream.DisplayTitle || subtitleStream.Language || "On") : "None",
        play_method: s.PlayState?.PlayMethod || (s.TranscodingInfo ? "Transcode" : "DirectPlay"),
        transcode_reason: (s.TranscodingInfo?.TranscodeReasons || []).join(", "),
        client_app: s.Client || "",
        client_version: s.ApplicationVersion || "",
        elapsed_seconds: Math.round(positionTicks / 10000000),
        duration_seconds: Math.round(runtimeTicks / 10000000),
        source_resolution: videoStream.Height ? `${videoStream.Width}x${videoStream.Height}` : "",
        source_video_codec: (videoStream.Codec || "").toUpperCase(),
        source_bitrate: videoStream.BitRate ? Math.round(videoStream.BitRate / 1000) : null,
      };
    });
}

function normalizePlex(server, raw) {
  return (Array.isArray(raw) ? raw : []).map((s) => {
    const runtime = Number(s.duration || 0);
    const position = Number(s.viewOffset || 0);
    const media = (s.Media && s.Media[0]) || {};
    const part = (media.Part && media.Part[0]) || {};
    const streams = part.Stream || [];
    const subtitleStream = streams.find((st) => st.streamType === 3 && st.selected);
    const base = server.url.replace(/\/$/, "");
    return {
      server_id: server.id,
      server_name: server.name,
      platform: server.platform,
      artwork_url: (s.grandparentThumb || s.thumb) ? `${base}${s.grandparentThumb || s.thumb}?X-Plex-Token=${server.api_key}` : null,
      session_key: String(s.sessionKey || s.Session?.id || s.ratingKey),
      username: s.User?.title || "Unknown",
      title: s.grandparentTitle ? `${s.grandparentTitle} - ${s.title}` : (s.title || "Unknown"),
      device: s.Player?.title || s.Player?.device || "Unknown device",
      player: s.Player?.platform || "",
      ip_address: s.Player?.address || "",
      state: s.Player?.state || "playing",
      transcode_decision: s.TranscodeSession ? "transcode" : "direct play",
      progress_percent: runtime ? Math.round((position / runtime) * 100) : 0,
      bitrate: Number(s.Session?.bandwidth || 0),
      video_codec: (media.videoCodec || "").toUpperCase(),
      audio_codec: (media.audioCodec || "").toUpperCase(),
      resolution: media.videoResolution ? `${media.videoResolution}p` : "",
      container: media.container || "",
      audio_channels: media.audioChannels || null,
      subtitle: subtitleStream ? (subtitleStream.displayTitle || subtitleStream.language || "On") : "None",
      play_method: s.TranscodeSession ? "Transcode" : "DirectPlay",
      transcode_reason: s.TranscodeSession ? [s.TranscodeSession.videoDecision, s.TranscodeSession.audioDecision].filter(Boolean).join(" / ") : "",
      client_app: s.Player?.product || "",
      client_version: s.Player?.version || "",
      elapsed_seconds: Math.round(position / 1000),
      duration_seconds: Math.round(runtime / 1000),
      source_resolution: media.videoResolution ? `${media.videoResolution}p` : "",
      source_video_codec: (s.TranscodeSession?.sourceVideoCodec || media.videoCodec || "").toUpperCase(),
      source_bitrate: media.bitrate || null,
    };
  });
}

// Fetches and normalizes currently active sessions for a single server
export async function getActiveSessions(server) {
  if (server.platform === "plex") {
    const raw = await PlexAPI.getSessions(server.url, server.api_key);
    return normalizePlex(server, raw);
  }
  const api = server.platform === "emby" ? EmbyAPI : JellyfinAPI;
  const raw = await api.getSessions(server.url, server.api_key);
  return normalizeJellyfinEmby(server, raw);
}

// Terminates a session and optionally shows a message to the user
export async function killSession(server, session, message) {
  if (server.platform === "plex") {
    return PlexAPI.terminateSession(server.url, server.api_key, session.session_key, message);
  }
  const api = apiFor(server);
  const sessionId = session.session_key;
  const fallbackId = session.play_session_id && session.play_session_id !== sessionId ? session.play_session_id : null;
  if (message) await api.sendMessage(server.url, server.api_key, sessionId, message).catch(() => {});
  try {
    return await api.stopSession(server.url, server.api_key, sessionId);
  } catch (e) {
    if (fallbackId) return api.stopSession(server.url, server.api_key, fallbackId);
    throw e;
  }
}