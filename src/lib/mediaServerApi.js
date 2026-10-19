/**
 * Media Server API Integration Layer
 * Handles communication with Plex, Jellyfin, and Emby APIs
 * 
 * NOTE: In production, these API calls should be made from a backend/serverless function
 * to protect API keys. This module documents the API structure and can be used
 * with a proxy backend.
 */

// ============================================================
// JELLYFIN API ENDPOINTS
// ============================================================
export const JellyfinAPI = {
  // Test connection
  async testConnection(baseUrl, apiKey) {
    const res = await fetch(`${baseUrl}/System/Info`, {
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Connection failed');
    return res.json();
  },

  // Get all libraries
  async getLibraries(baseUrl, apiKey) {
    const res = await fetch(`${baseUrl}/Library/VirtualFolders`, {
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Failed to fetch libraries');
    const data = await res.json();
    return data.map(lib => ({
      id: lib.ItemId,
      guid: lib.Guid,
      name: lib.Name,
      type: lib.CollectionType || 'unknown'
    }));
  },

  // Create a new user
  async createUser(baseUrl, apiKey, username, password) {
    const res = await fetch(`${baseUrl}/Users/New`, {
      method: 'POST',
      headers: {
        'X-Emby-Token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ Name: username, Password: password })
    });
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  },

  // Set user library access policy. Fetches the user's current policy first and
  // only changes folder access, preserving every other permission (admin status,
  // hidden, transcoding, etc.) so editing libraries is non-destructive.
  async setUserPolicy(baseUrl, apiKey, userId, libraryIds) {
    const userRes = await fetch(`${baseUrl}/Users/${userId}`, {
      headers: { 'X-Emby-Token': apiKey, 'Accept': 'application/json' }
    });
    if (!userRes.ok) {
      if (userRes.status === 404) throw new Error('This user no longer exists on the server (they may have been removed). Remove the record and re-invite them.');
      throw new Error('Failed to load user policy');
    }
    const user = await userRes.json();
    const policy = { ...(user.Policy || {}) };
    policy.EnableAllFolders = false;
    policy.EnabledFolders = libraryIds;
    const res = await fetch(`${baseUrl}/Users/${userId}/Policy`, {
      method: 'POST',
      headers: { 'X-Emby-Token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(policy)
    });
    if (!res.ok) throw new Error('Failed to set user policy');
  },

  // Delete a user
  async deleteUser(baseUrl, apiKey, userId) {
    const res = await fetch(`${baseUrl}/Users/${userId}`, {
      method: 'DELETE',
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Failed to delete user');
  },

  // Enable/disable a user's login (suspend / reactivate)
  async setDisabled(baseUrl, apiKey, userId, disabled, libraryIds = []) {
    const res = await fetch(`${baseUrl}/Users/${userId}/Policy`, {
      method: 'POST',
      headers: { 'X-Emby-Token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        IsAdministrator: false,
        IsHidden: true,
        IsDisabled: disabled,
        EnableAllFolders: false,
        EnabledFolders: libraryIds,
        EnableRemoteAccess: !disabled,
        EnableMediaPlayback: !disabled,
      })
    });
    if (!res.ok) throw new Error('Failed to update user status');
  },

  // Reset a user's password
  async resetPassword(baseUrl, apiKey, userId, newPassword) {
    const res = await fetch(`${baseUrl}/Users/${userId}/Password`, {
      method: 'POST',
      headers: { 'X-Emby-Token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ResetPassword: false, NewPw: newPassword })
    });
    if (!res.ok) throw new Error('Failed to reset password');
  },

  // Get all users
  async getUsers(baseUrl, apiKey) {
    const res = await fetch(`${baseUrl}/Users`, {
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  // Get users with their assigned library access, normalized
  async getUsersWithLibraries(baseUrl, apiKey, serverLibraries = []) {
    const users = await this.getUsers(baseUrl, apiKey);
    return (Array.isArray(users) ? users : []).map((u) => {
      const policy = u.Policy || {};
      const enabledIds = policy.EnabledFolders || [];
      const libraries = policy.EnableAllFolders
        ? serverLibraries
        : serverLibraries.filter((l) => enabledIds.includes(l.guid || l.id));
      return {
        platform_user_id: u.Id,
        username: u.Name,
        email: '',
        libraries,
      };
    });
  },

  // Get currently active playback sessions
  async getSessions(baseUrl, apiKey) {
    const res = await fetch(`${baseUrl}/Sessions`, {
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  // Send an on-screen message to a session's client
  async sendMessage(baseUrl, apiKey, sessionId, text) {
    await fetch(`${baseUrl}/Sessions/${sessionId}/Message`, {
      method: 'POST',
      headers: { 'X-Emby-Token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ Header: 'Message from Admin', Text: text, TimeoutMs: 10000 })
    });
  },

  // Stop playback on a session
  async stopSession(baseUrl, apiKey, sessionId) {
    const res = await fetch(`${baseUrl}/Sessions/${sessionId}/Playing/Stop`, {
      method: 'POST',
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Failed to stop session');
  },

  // Get item count + total storage size for a library
  async getLibraryStats(baseUrl, apiKey, libraryId) {
    const res = await fetch(
      `${baseUrl}/Items?ParentId=${libraryId}&Recursive=true&Fields=MediaSources&IncludeItemTypes=Movie,Episode,Audio&Limit=5000`,
      { headers: { 'X-Emby-Token': apiKey } }
    );
    if (!res.ok) throw new Error('Failed to fetch library stats');
    const data = await res.json();
    const items = data.Items || [];
    const itemCount = data.TotalRecordCount ?? items.length;
    const storageBytes = items.reduce((sum, it) => sum + (it.MediaSources?.[0]?.Size || 0), 0);
    return { itemCount, storageBytes };
  }
};

// ============================================================
// EMBY API ENDPOINTS  
// ============================================================
export const EmbyAPI = {
  // Test connection
  async testConnection(baseUrl, apiKey) {
    const res = await fetch(`${baseUrl}/System/Info`, {
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Connection failed');
    return res.json();
  },

  // Get all libraries
  async getLibraries(baseUrl, apiKey) {
    const res = await fetch(`${baseUrl}/Library/VirtualFolders`, {
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Failed to fetch libraries');
    const data = await res.json();
    return data.map(lib => ({
      id: lib.ItemId,
      guid: lib.Guid,
      name: lib.Name,
      type: lib.CollectionType || 'unknown'
    }));
  },

  // Create a new user
  async createUser(baseUrl, apiKey, username, password) {
    const res = await fetch(`${baseUrl}/Users/New`, {
      method: 'POST',
      headers: {
        'X-Emby-Token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ Name: username, Password: password })
    });
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  },

  // Set user policy. Fetches the user's current policy first and only changes
  // folder access, preserving every other permission so editing libraries is
  // non-destructive (identical approach to Jellyfin).
  async setUserPolicy(baseUrl, apiKey, userId, libraryIds) {
    const userRes = await fetch(`${baseUrl}/Users/${userId}`, {
      headers: { 'X-Emby-Token': apiKey, 'Accept': 'application/json' }
    });
    if (!userRes.ok) {
      if (userRes.status === 404) throw new Error('This user no longer exists on the server (they may have been removed). Remove the record and re-invite them.');
      throw new Error('Failed to load user policy');
    }
    const user = await userRes.json();
    const policy = { ...(user.Policy || {}) };
    policy.EnableAllFolders = false;
    policy.EnabledFolders = libraryIds;
    const res = await fetch(`${baseUrl}/Users/${userId}/Policy`, {
      method: 'POST',
      headers: { 'X-Emby-Token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(policy)
    });
    if (!res.ok) throw new Error('Failed to set user policy');
  },

  // Delete a user
  async deleteUser(baseUrl, apiKey, userId) {
    const res = await fetch(`${baseUrl}/Users/${userId}`, {
      method: 'DELETE',
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Failed to delete user');
  },

  // Enable/disable a user's login (suspend / reactivate)
  async setDisabled(baseUrl, apiKey, userId, disabled, libraryIds = []) {
    const res = await fetch(`${baseUrl}/Users/${userId}/Policy`, {
      method: 'POST',
      headers: { 'X-Emby-Token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        IsAdministrator: false,
        IsHidden: true,
        IsDisabled: disabled,
        EnableAllFolders: false,
        EnabledFolders: libraryIds,
        EnableRemoteAccess: !disabled,
        EnableMediaPlayback: !disabled,
      })
    });
    if (!res.ok) throw new Error('Failed to update user status');
  },

  // Reset a user's password
  async resetPassword(baseUrl, apiKey, userId, newPassword) {
    const res = await fetch(`${baseUrl}/Users/${userId}/Password`, {
      method: 'POST',
      headers: { 'X-Emby-Token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ResetPassword: false, NewPw: newPassword })
    });
    if (!res.ok) throw new Error('Failed to reset password');
  },

  async getUsers(baseUrl, apiKey) {
    const res = await fetch(`${baseUrl}/Users`, {
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  // Get users with their assigned library access, normalized
  async getUsersWithLibraries(baseUrl, apiKey, serverLibraries = []) {
    const users = await this.getUsers(baseUrl, apiKey);
    return (Array.isArray(users) ? users : []).map((u) => {
      const policy = u.Policy || {};
      const enabledIds = policy.EnabledFolders || [];
      const libraries = policy.EnableAllFolders
        ? serverLibraries
        : serverLibraries.filter((l) => enabledIds.includes(l.guid || l.id));
      return {
        platform_user_id: u.Id,
        username: u.Name,
        email: '',
        libraries,
      };
    });
  },

  // Get currently active playback sessions
  async getSessions(baseUrl, apiKey) {
    const res = await fetch(`${baseUrl}/Sessions`, {
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  // Send an on-screen message to a session's client
  async sendMessage(baseUrl, apiKey, sessionId, text) {
    await fetch(`${baseUrl}/Sessions/${sessionId}/Message`, {
      method: 'POST',
      headers: { 'X-Emby-Token': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ Header: 'Message from Admin', Text: text, TimeoutMs: 10000 })
    });
  },

  // Stop playback on a session
  async stopSession(baseUrl, apiKey, sessionId) {
    const res = await fetch(`${baseUrl}/Sessions/${sessionId}/Playing/Stop`, {
      method: 'POST',
      headers: { 'X-Emby-Token': apiKey }
    });
    if (!res.ok) throw new Error('Failed to stop session');
  },

  // Get item count + total storage size for a library
  async getLibraryStats(baseUrl, apiKey, libraryId) {
    const res = await fetch(
      `${baseUrl}/Items?ParentId=${libraryId}&Recursive=true&Fields=MediaSources&IncludeItemTypes=Movie,Episode,Audio&Limit=5000`,
      { headers: { 'X-Emby-Token': apiKey } }
    );
    if (!res.ok) throw new Error('Failed to fetch library stats');
    const data = await res.json();
    const items = data.Items || [];
    const itemCount = data.TotalRecordCount ?? items.length;
    const storageBytes = items.reduce((sum, it) => sum + (it.MediaSources?.[0]?.Size || 0), 0);
    return { itemCount, storageBytes };
  }
};

// ============================================================
// PLEX API ENDPOINTS
// ============================================================

// plex.tv's v2 API requires client identification headers or it rejects requests
const PLEX_TV_HEADERS = {
  'X-Plex-Product': 'MediaPass',
  'X-Plex-Version': '1.0',
  'X-Plex-Client-Identifier': 'mediapass-app',
};

export const PlexAPI = {
  // Test connection
  async testConnection(baseUrl, token) {
    const res = await fetch(`${baseUrl}/`, {
      headers: {
        'X-Plex-Token': token,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Connection failed');
    return res.json();
  },

  // Get all libraries
  async getLibraries(baseUrl, token) {
    const res = await fetch(`${baseUrl}/library/sections`, {
      headers: {
        'X-Plex-Token': token,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Failed to fetch libraries');
    const data = await res.json();
    return data.MediaContainer.Directory.map(lib => ({
      id: String(lib.key),
      name: lib.title,
      type: lib.type
    }));
  },

  // Invite friend (share libraries)
  // Plex uses a different model: you invite by email/username
  // and share specific library sections
  async inviteUser(baseUrl, token, email, libraryIds, machineId) {
    // Step 1: Send invite to Plex account
    const inviteRes = await fetch(`https://plex.tv/api/v2/shared_servers`, {
      method: 'POST',
      headers: {
        'X-Plex-Token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...PLEX_TV_HEADERS
      },
      body: JSON.stringify({
        machineIdentifier: machineId,
        invitedEmail: email,
        librarySectionIds: libraryIds.map(Number),
        settings: {
          allowSync: false,
          allowCameraUpload: false,
          allowChannels: false,
          filterMovies: '',
          filterTelevision: '',
          filterMusic: ''
        }
      })
    });
    if (!inviteRes.ok) throw new Error('Failed to invite user');
    return inviteRes.json();
  },

  // Remove friend/shared user
  async removeUser(token, sharedUserId) {
    const res = await fetch(`https://plex.tv/api/v2/shared_servers/${sharedUserId}`, {
      method: 'DELETE',
      headers: {
        'X-Plex-Token': token,
        'Accept': 'application/json',
        ...PLEX_TV_HEADERS
      }
    });
    if (!res.ok) throw new Error('Failed to remove user');
  },

  // Get shared users (friends) — uses the legacy plex.tv/api/users endpoint since
  // v2/shared_servers requires a machine identifier scoped to a specific server.
  // This endpoint only returns XML, so it's parsed manually here.
  async getSharedUsers(token) {
    const res = await fetch(`https://plex.tv/api/users`, {
      headers: {
        'X-Plex-Token': token,
        ...PLEX_TV_HEADERS
      }
    });
    if (!res.ok) throw new Error('Failed to fetch shared users');
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    return Array.from(xml.querySelectorAll('User')).map((el) => ({
      id: el.getAttribute('id'),
      username: el.getAttribute('username'),
      title: el.getAttribute('title'),
      email: el.getAttribute('email'),
      Server: Array.from(el.querySelectorAll('Server')).map((s) => ({
        id: s.getAttribute('id'),
        machineIdentifier: s.getAttribute('machineIdentifier'),
        allLibraries: s.getAttribute('allLibraries'),
        numLibraries: s.getAttribute('numLibraries'),
      })),
    }));
  },

  // Get machine identifier
  async getMachineId(baseUrl, token) {
    const res = await fetch(`${baseUrl}/`, {
      headers: {
        'X-Plex-Token': token,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Failed to get machine ID');
    const data = await res.json();
    return data.MediaContainer.machineIdentifier;
  },

  // Fetch the v2 shared-servers list (JSON), which exposes the actual
  // librarySectionIds each shared user can access on a given server.
  async getSharedServersV2(token) {
    const res = await fetch(`https://plex.tv/api/v2/shared_servers`, {
      headers: {
        'X-Plex-Token': token,
        'Accept': 'application/json',
        ...PLEX_TV_HEADERS
      }
    });
    if (!res.ok) throw new Error('Failed to fetch shared servers');
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.sharedServers || []);
  },

  // Get shared users with their ACTUAL per-library access, normalized.
  // The v2 collection endpoint (GET /api/v2/shared_servers) is not available for
  // listing, so we enumerate shared users + their per-server sharedServerId via
  // the legacy /api/users endpoint, then fetch each user's real library section
  // keys via GET /api/v2/shared_servers/{sharedServerId}. platform_user_id is
  // set to the v2 sharedServerId, which updateSharedLibraries/removeUser require.
  async getUsersWithLibraries(baseUrl, token, serverLibraries = [], machineId) {
    if (!machineId) {
      try { machineId = await this.getMachineId(baseUrl, token); } catch {}
    }

    let legacyUsers = [];
    try { legacyUsers = await this.getSharedUsers(token); } catch {}

    const scoped = legacyUsers
      .map((u) => {
        const srv = (u.Server || []).find((s) => !machineId || s.machineIdentifier === machineId);
        return srv
          ? { user: u, sharedServerId: srv.id, allLibraries: srv.allLibraries === '1' }
          : null;
      })
      .filter(Boolean);

    const CONCURRENCY = 8;
    const results = [];
    for (let i = 0; i < scoped.length; i += CONCURRENCY) {
      const batch = scoped.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(async (entry) => {
        let libKeys = [];
        let allLibraries = entry.allLibraries;
        try {
          const r = await fetch(`https://plex.tv/api/v2/shared_servers/${entry.sharedServerId}`, {
            headers: { 'X-Plex-Token': token, 'Accept': 'application/json', ...PLEX_TV_HEADERS }
          });
          if (r.ok) {
            const d = await r.json();
            allLibraries = !!d.allLibraries;
            libKeys = (d.libraries || []).map((l) => String(l.key));
          }
        } catch {}
        const libraries = allLibraries
          ? serverLibraries
          : serverLibraries.filter((l) => libKeys.includes(String(l.id)));
        return {
          platform_user_id: String(entry.sharedServerId),
          username: entry.user.username || entry.user.title || entry.user.email || 'Unknown',
          email: entry.user.email || '',
          libraries,
        };
      }));
      results.push(...batchResults);
    }
    return results;
  },

  // Suspend access by clearing shared libraries (invite stays, access is revoked)
  async suspendSharedUser(token, sharedServerId) {
    return this.updateSharedLibraries(token, sharedServerId, []);
  },

  // Update which libraries a shared user can access
  async updateSharedLibraries(token, sharedServerId, libraryIds) {
    const res = await fetch(`https://plex.tv/api/v2/shared_servers/${sharedServerId}`, {
      method: 'PUT',
      headers: {
        'X-Plex-Token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...PLEX_TV_HEADERS
      },
      body: JSON.stringify({ librarySectionIds: libraryIds.map(Number) })
    });
    if (!res.ok) throw new Error('Failed to update library access');
    return res.json();
  },

  // Get currently active playback sessions
  async getSessions(baseUrl, token) {
    const res = await fetch(`${baseUrl}/status/sessions`, {
      headers: {
        'X-Plex-Token': token,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    const data = await res.json();
    return data?.MediaContainer?.Metadata || [];
  },

  // Terminate a session, showing the given reason/message to the client
  async terminateSession(baseUrl, token, sessionKey, reason) {
    const params = new URLSearchParams({ sessionId: sessionKey, reason: reason || 'Stopped by admin' });
    const res = await fetch(`${baseUrl}/status/sessions/terminate?${params.toString()}`, {
      headers: { 'X-Plex-Token': token, 'Accept': 'application/json', ...PLEX_TV_HEADERS }
    });
    if (!res.ok) throw new Error('Failed to terminate session');
  },

  // Get item count + total storage size for a library
  async getLibraryStats(baseUrl, token, libraryId) {
    const res = await fetch(`${baseUrl}/library/sections/${libraryId}/all`, {
      headers: { 'X-Plex-Token': token, 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to fetch library stats');
    const data = await res.json();
    const metadata = data?.MediaContainer?.Metadata || [];
    const itemCount = data?.MediaContainer?.size ?? metadata.length;
    const storageBytes = metadata.reduce((sum, item) => {
      const parts = (item.Media || []).flatMap((m) => m.Part || []);
      return sum + parts.reduce((s, p) => s + (p.size || 0), 0);
    }, 0);
    return { itemCount, storageBytes };
  }
};

// ============================================================
// UNIFIED API HELPER
// ============================================================
export function getApiForPlatform(platform) {
  switch (platform) {
    case 'plex': return PlexAPI;
    case 'jellyfin': return JellyfinAPI;
    case 'emby': return EmbyAPI;
    default: throw new Error(`Unknown platform: ${platform}`);
  }
}

// Generate a secure random token for invitation links
export function generateInviteToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Calculate expiry date from duration type
export function calculateExpiry(durationType, customHours) {
  const now = new Date();
  switch (durationType) {
    case '1_day': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case '2_days': return new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    case '1_week': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'custom': return new Date(now.getTime() + (customHours || 24) * 60 * 60 * 1000);
    default: return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

// Duration type to hours mapping
export function durationToHours(durationType, customHours) {
  switch (durationType) {
    case '1_day': return 24;
    case '2_days': return 48;
    case '1_week': return 168;
    case 'custom': return customHours || 24;
    default: return 24;
  }
}