import { base44 } from "@/api/base44Client";
import { getApiForPlatform } from "@/lib/mediaServerApi";

// Pulls the live user list (with library access) from a media server and
// upserts it into the ServerUser entity, preserving any admin-set friendly_name.
//
// Libraries are fetched fresh from the server on every sync so user access is
// matched against the real, up-to-date library list — not a possibly-stale copy
// stored on the MediaServer entity (which is what caused users to show no access
// or incorrect access). The fresh library list is also written back to the
// MediaServer so the edit modal shows the correct libraries.
export async function syncServerUsers(server) {
  const api = getApiForPlatform(server.platform);

  // Fetch the current library list straight from the server.
  let serverLibraries = server.libraries || [];
  try {
    const fresh = await api.getLibraries(server.url, server.api_key);
    if (Array.isArray(fresh) && fresh.length) {
      serverLibraries = fresh;
      await base44.entities.MediaServer.update(server.id, { libraries: fresh });
    }
  } catch (err) {
    console.error(`Failed to fetch libraries for ${server.name}`, err);
  }

  const liveUsers = await api.getUsersWithLibraries(server.url, server.api_key, serverLibraries);
  const existing = await base44.entities.ServerUser.filter({ server_id: server.id });
  const byPlatformId = new Map(existing.map((u) => [u.platform_user_id, u]));
  const byEmail = new Map(
    existing.filter((u) => u.email).map((u) => [String(u.email).toLowerCase(), u])
  );
  // Username fallback so a user who was removed and re-added (new platform_user_id
  // but same login name) is reconnected to their existing record instead of
  // creating a duplicate and leaving a stale, uneditable record behind.
  const byUsername = new Map(
    existing.filter((u) => u.username).map((u) => [String(u.username).toLowerCase(), u])
  );

  const matchedIds = new Set();
  for (const lu of liveUsers) {
    const match = byPlatformId.get(lu.platform_user_id)
      || (lu.email ? byEmail.get(String(lu.email).toLowerCase()) : undefined)
      || (lu.username ? byUsername.get(String(lu.username).toLowerCase()) : undefined);
    if (match) {
      matchedIds.add(match.id);
      await base44.entities.ServerUser.update(match.id, {
        platform_user_id: lu.platform_user_id,
        username: lu.username,
        email: lu.email,
        libraries: lu.libraries,
        server_name: server.name,
      });
    } else {
      await base44.entities.ServerUser.create({
        server_id: server.id,
        server_name: server.name,
        platform: server.platform,
        platform_user_id: lu.platform_user_id,
        username: lu.username,
        email: lu.email,
        friendly_name: lu.username,
        libraries: lu.libraries,
      });
    }
  }

  // Remove records for users no longer on the server (deleted/removed there).
  // They can't be edited and clutter the list; if re-added, the sync recreates
  // a fresh record above.
  const stale = existing.filter((u) => !matchedIds.has(u.id));
  if (stale.length) {
    await base44.entities.ServerUser.deleteMany({
      server_id: server.id,
      id: { $in: stale.map((u) => u.id) },
    });
  }

  await base44.entities.MediaServer.update(server.id, { users_last_synced: new Date().toISOString() });

  return base44.entities.ServerUser.filter({ server_id: server.id });
}