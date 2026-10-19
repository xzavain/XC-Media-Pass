import { base44 } from "@/api/base44Client";

let oauthConfig = null;

// Fetch Discord OAuth config from DiscordBotConfig (client_id, redirect_uri)
// and bot token + guild ID from LoyaltyTier rank 0 (readable by all RLS)
export async function getDiscordOAuthConfig({ force = false } = {}) {
  if (oauthConfig && !force) return oauthConfig;
  const [botConfigs, tiers] = await Promise.all([
    base44.entities.DiscordBotConfig.list(),
    base44.entities.LoyaltyTier.list("tier_rank", 50),
  ]);
  const botConfig = botConfigs[0] || {};
  const rank0Tier = tiers.find((t) => (t.tier_rank || 0) === 0) || tiers[0] || {};
  oauthConfig = {
    clientId: botConfig.discord_client_id,
    redirectUri: botConfig.discord_redirect_uri || `${window.location.origin}/discord-callback`,
    botToken: rank0Tier.discord_bot_token,
    guildId: rank0Tier.discord_guild_id,
  };
  return oauthConfig;
}

// Generate cryptographically secure state, open Discord OAuth2 in a popup
export async function initiateDiscordOAuth() {
  const config = await getDiscordOAuthConfig();
  if (!config.clientId) {
    throw new Error("Discord OAuth is not configured. Ask an admin to set the Client ID in Discord Settings.");
  }

  const state = crypto.randomUUID();
  sessionStorage.setItem("discord_oauth_state", state);

  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=token&scope=identify%20guilds%20guilds.join&state=${state}`;

  const popup = window.open(authUrl, "discord_oauth", "width=550,height=800,menubar=no,toolbar=no,scrollbars=yes");
  if (!popup) throw new Error("Popup blocked. Please allow popups for this site.");
  return popup;
}

// Exchange the access token for Discord user identity, join guild, return profile data
export async function handleDiscordCallback(accessToken, state) {
  const expectedState = sessionStorage.getItem("discord_oauth_state");
  if (state !== expectedState) throw new Error("State validation failed — possible CSRF attempt.");
  sessionStorage.removeItem("discord_oauth_state");

  const config = await getDiscordOAuthConfig();

  // Fetch user identity
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) throw new Error("Failed to fetch Discord user identity.");
  const discordUser = await userRes.json();

  // Join / verify user in the community guild using bot credentials
  if (config.botToken && config.guildId) {
    try {
      await fetch(`https://discord.com/api/guilds/${config.guildId}/members/${discordUser.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${config.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
    } catch {
      // Best-effort — user may already be a member
    }
  }

  return {
    discord_user_id: discordUser.id,
    discord_username: discordUser.global_name || discordUser.username,
    discord_avatar_url: discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null,
    is_discord_synced: true,
  };
}

// Assign a Discord role to a user via Bot API
export async function assignDiscordRole(discordUserId, roleId) {
  const config = await getDiscordOAuthConfig();
  if (!config.botToken || !config.guildId || !roleId || !discordUserId) return false;
  const res = await fetch(`https://discord.com/api/guilds/${config.guildId}/members/${discordUserId}/roles/${roleId}`, {
    method: "PUT",
    headers: { Authorization: `Bot ${config.botToken}` },
  });
  return res.ok;
}

// Remove a Discord role from a user via Bot API
export async function removeDiscordRole(discordUserId, roleId) {
  const config = await getDiscordOAuthConfig();
  if (!config.botToken || !config.guildId || !roleId || !discordUserId) return false;
  const res = await fetch(`https://discord.com/api/guilds/${config.guildId}/members/${discordUserId}/roles/${roleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bot ${config.botToken}` },
  });
  return res.ok;
}