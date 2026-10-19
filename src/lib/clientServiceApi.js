import { base44 } from "@/api/base44Client";
import { getApiForPlatform } from "@/lib/mediaServerApi";
import { getActiveSessions, killSession } from "@/lib/sessionsApi";

// Suspend a server user's access (keeps the account/invite, revokes library access)
export async function suspendServerUser(server, serverUser) {
  const api = getApiForPlatform(server.platform);
  if (server.platform === "plex") {
    await api.suspendSharedUser(server.api_key, serverUser.platform_user_id);
  } else {
    await api.setDisabled(server.url, server.api_key, serverUser.platform_user_id, true, []);
  }
  const updated = await base44.entities.ServerUser.update(serverUser.id, {
    is_suspended: true,
    suspended_libraries_backup: serverUser.libraries || [],
    libraries: [],
  });
  await base44.entities.ActivityLog.create({
    action: "user_suspended",
    server_id: server.id,
    username: serverUser.friendly_name || serverUser.username,
    platform: server.platform,
    details: `${serverUser.friendly_name || serverUser.username} was suspended on ${server.name}. Re-invite manually when ready.`,
  });
  return updated;
}

// Reactivate a previously suspended server user, restoring their prior libraries
export async function reactivateServerUser(server, serverUser) {
  const api = getApiForPlatform(server.platform);
  const restoreLibraries = serverUser.suspended_libraries_backup || [];
  const libraryIds = restoreLibraries.map((l) => l.id);
  if (server.platform === "plex") {
    await api.updateSharedLibraries(server.api_key, serverUser.platform_user_id, libraryIds);
  } else {
    await api.setDisabled(server.url, server.api_key, serverUser.platform_user_id, false, libraryIds);
  }
  return base44.entities.ServerUser.update(serverUser.id, {
    is_suspended: false,
    libraries: restoreLibraries,
    suspended_libraries_backup: [],
  });
}

// Permanently terminate a server user's account/invite and remove the local record
export async function terminateServerUser(server, serverUser) {
  const api = getApiForPlatform(server.platform);
  if (server.platform === "plex") {
    await api.removeUser(server.api_key, serverUser.platform_user_id);
  } else {
    await api.deleteUser(server.url, server.api_key, serverUser.platform_user_id);
  }
  await base44.entities.ActivityLog.create({
    action: "user_removed",
    server_id: server.id,
    username: serverUser.friendly_name || serverUser.username,
    platform: server.platform,
    details: `${serverUser.friendly_name || serverUser.username} was terminated from ${server.name}. Re-invite manually when ready.`,
  });
  return base44.entities.ServerUser.delete(serverUser.id);
}

// Reset a Jellyfin/Emby user's password (not supported for Plex)
export async function changeServerUserPassword(server, serverUser, newPassword) {
  if (server.platform === "plex") {
    throw new Error("Plex passwords are managed by the user's Plex account and cannot be changed here.");
  }
  const api = getApiForPlatform(server.platform);
  return api.resetPassword(server.url, server.api_key, serverUser.platform_user_id, newPassword);
}

// Find and terminate all active sessions for this server user
export async function dropServerUserSessions(server, serverUser) {
  const sessions = await getActiveSessions(server);
  const key = (serverUser.username || "").toLowerCase();
  const matches = sessions.filter((s) => (s.username || "").toLowerCase() === key);
  for (const session of matches) {
    await killSession(server, session, "Your session was ended by an administrator.");
  }
  return matches.length;
}