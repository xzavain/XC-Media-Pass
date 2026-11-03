/**
 * Server-side media account provisioning for invite activation.
 *
 * Mirrors the browser-side logic in src/lib/mediaServerApi.js, but runs on
 * the server so the public invite page never needs the media server's API
 * key (and browser CORS never gets in the way):
 *   - Emby / Jellyfin: POST /Users/New, then restrict library access via
 *     the user's policy (EnableAllFolders=false + EnabledFolders).
 *   - Plex: invites are by email — resolve the server's machine identifier,
 *     then POST to plex.tv /api/v2/shared_servers.
 *
 * `server` is a MediaServer record ({ platform, url, api_key }).
 * `libraries` is the invitation's allowed_libraries ([{id, name}] or ids).
 * Returns { platform_user_id } on success; throws with a plain-language
 * message on failure.
 */

function trimBase(url) {
  return String(url || '').replace(/\/$/, '');
}

function libraryIds(libraries) {
  if (!Array.isArray(libraries)) return [];
  return libraries.map((l) => (l && typeof l === 'object' ? l.id : l)).filter((v) => v !== undefined && v !== null && v !== '');
}

async function provisionEmbyLike(server, { username, password, libraries }) {
  const base = trimBase(server.url);
  const headers = { 'X-Emby-Token': server.api_key, 'Content-Type': 'application/json' };

  const createRes = await fetch(`${base}/Users/New`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ Name: username, Password: password }),
  });
  if (!createRes.ok) {
    const detail = await createRes.text().catch(() => '');
    throw new Error(`The media server refused to create the account (${createRes.status}). ${detail.slice(0, 200)}`.trim());
  }
  const user = await createRes.json().catch(() => ({}));
  if (!user.Id) throw new Error('The media server did not return a user ID for the new account.');

  const ids = libraryIds(libraries);
  if (ids.length) {
    // Preserve the server's default policy; only restrict folder access,
    // exactly like the admin-side flow does.
    const userRes = await fetch(`${base}/Users/${user.Id}`, {
      headers: { 'X-Emby-Token': server.api_key, Accept: 'application/json' },
    });
    if (userRes.ok) {
      const full = await userRes.json().catch(() => ({}));
      const policy = { ...(full.Policy || {}) };
      policy.EnableAllFolders = false;
      policy.EnabledFolders = ids.map(String);
      const policyRes = await fetch(`${base}/Users/${user.Id}/Policy`, {
        method: 'POST',
        headers,
        body: JSON.stringify(policy),
      });
      if (!policyRes.ok) {
        throw new Error(`Account created, but setting library access failed (${policyRes.status}). An admin can finish setup from Server Users.`);
      }
    }
  }
  return { platform_user_id: user.Id };
}

async function provisionPlex(server, { email, libraries }) {
  if (!email) {
    throw new Error('Plex invites are sent by email — an email address is required to activate a Plex invite.');
  }
  const base = trimBase(server.url);
  const identityRes = await fetch(`${base}/identity`, {
    headers: { 'X-Plex-Token': server.api_key, Accept: 'application/json' },
  });
  if (!identityRes.ok) {
    throw new Error(`Could not reach the Plex server to read its identity (${identityRes.status}).`);
  }
  const identityText = await identityRes.text();
  const machineId = identityText.match(/machineIdentifier="([^"]+)"/)?.[1]
    || identityText.match(/"machineIdentifier"\s*:\s*"([^"]+)"/)?.[1];
  if (!machineId) throw new Error('Could not determine the Plex server machine identifier.');

  const inviteRes = await fetch('https://plex.tv/api/v2/shared_servers', {
    method: 'POST',
    headers: {
      'X-Plex-Token': server.api_key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Plex-Product': 'XC Media Pass',
      'X-Plex-Client-Identifier': 'xcmp-server',
    },
    body: JSON.stringify({
      machineIdentifier: machineId,
      invitedEmail: email,
      librarySectionIds: libraryIds(libraries).map(Number).filter((n) => Number.isFinite(n)),
      settings: {
        allowSync: false,
        allowCameraUpload: false,
        allowChannels: false,
        filterMovies: '',
        filterTelevision: '',
        filterMusic: '',
      },
    }),
  });
  if (!inviteRes.ok) {
    const detail = await inviteRes.text().catch(() => '');
    throw new Error(`Plex refused the invite (${inviteRes.status}). ${detail.slice(0, 200)}`.trim());
  }
  const data = await inviteRes.json().catch(() => ({}));
  return { platform_user_id: data.id ? String(data.id) : email };
}

export async function provisionMediaAccount(server, request) {
  if (!server) throw new Error('The media server for this invite no longer exists.');
  if (!server.url || !server.api_key) {
    throw new Error('The media server for this invite is missing its URL or API key — an admin needs to fix the server record.');
  }
  switch (server.platform) {
    case 'emby':
    case 'jellyfin':
      return provisionEmbyLike(server, request);
    case 'plex':
      return provisionPlex(server, request);
    default:
      throw new Error(`Unsupported media platform: ${server.platform}`);
  }
}
