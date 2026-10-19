import { posterUrl } from "@/lib/mediaDiscoveryApi";
import {
  appendToPlexWatchlist,
  appendToEmbyFavorites,
  appendToJellyfinFavorites,
  WRITEBACK_ENABLED,
} from "@/lib/watchlistSyncApi";

// Dispatch watchlist write-back to all enabled platforms for a user.
// Write-back is gated behind WRITEBACK_ENABLED — disabled until inbound sync is verified.
export async function dispatchWatchlistSync(watchlistItem, release, linkedAccounts) {
  if (!WRITEBACK_ENABLED) {
    return linkedAccounts.map((a) => ({
      platform: a.service_type,
      success: false,
      error: "Write-back disabled — inbound sync only",
    }));
  }
  const results = [];
  for (const account of linkedAccounts) {
    try {
      if (account.service_type === "plex" && watchlistItem.sync_plex) {
        await appendToPlexWatchlist(release.tmdb_id, account.auth_token);
        results.push({ platform: "plex", success: true });
      } else if (account.service_type === "emby" && watchlistItem.sync_emby) {
        await appendToEmbyFavorites(account.server_url, account.auth_token, account.external_user_id, release.tmdb_id);
        results.push({ platform: "emby", success: true });
      } else if (account.service_type === "jellyfin" && watchlistItem.sync_jellyfin) {
        await appendToJellyfinFavorites(account.server_url, account.auth_token, account.external_user_id, release.tmdb_id);
        results.push({ platform: "jellyfin", success: true });
      }
    } catch (err) {
      results.push({ platform: account.service_type, success: false, error: err.message });
    }
  }
  return results;
}

// Send a Discord webhook with a rich embed
export async function sendDiscordWebhook(webhookUrl, release, options = {}, eventType = "vod_dropped") {
  const colorHex = (options.embed_color || "#6366f1").replace("#", "");
  const colorInt = parseInt(colorHex, 16);

  const eventTitles = {
    theatrical_today: `🎬 Theatrical Premiere: ${release.title}`,
    vod_dropped: `📺 Digital VOD Release: ${release.title}`,
    imported_to_server: `✅ Now Streaming: ${release.title}`,
  };

  const embed = {
    title: eventTitles[eventType] || release.title,
    description: release.overview?.slice(0, 300) || "",
    url: release.trailer_youtube_key ? `https://www.youtube.com/watch?v=${release.trailer_youtube_key}` : undefined,
    thumbnail: release.poster_path ? { url: posterUrl(release.poster_path, "w500") } : undefined,
    image: release.backdrop_path ? { url: `https://image.tmdb.org/t/p/original${release.backdrop_path}` } : undefined,
    color: colorInt,
    fields: [
      { name: "Digital VOD", value: release.digital_vod_release_date || "TBD", inline: true },
      { name: "Theatrical", value: release.theatrical_release_date || "TBD", inline: true },
      { name: "Server Status", value: release.server_import_status?.replace(/_/g, " ") || "unannounced", inline: true },
    ],
    footer: { text: "MediaEdge Release Tracker" },
    timestamp: new Date().toISOString(),
  };

  let content = undefined;
  if (options.mention_type === "everyone") content = "@everyone";
  else if (options.mention_type === "here") content = "@here";
  else if (options.mention_type === "role" && options.role_id) content = `<@&${options.role_id}>`;

  const payload = {
    username: options.bot_name || "MediaEdge Announcer",
    avatar_url: options.bot_avatar_url || undefined,
    content,
    embeds: [embed],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Discord webhook failed: ${res.status}`);
  return true;
}