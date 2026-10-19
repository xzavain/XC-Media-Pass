import { base44 } from "@/api/base44Client";

const PLEX_CLIENT_ID = "mediapass-app";
const PLEX_PRODUCT = "MediaPass";

// ─── Identity Management ───

export async function getOrCreateUniversalIdentity(user) {
  const existing = await base44.entities.UserUniversalMediaIdentity.filter({ user_id: user.id });
  if (existing[0]) return existing[0];
  return base44.entities.UserUniversalMediaIdentity.create({ user_id: user.id });
}

// ─── Admin Node Queries ───

export async function getAdminNodes(serviceType) {
  const all = await base44.entities.AdminManagedNodes.list();
  return serviceType ? all.filter((n) => n.service_type === serviceType) : all;
}

export async function getDiagnosticNodes() {
  const all = await base44.entities.AdminManagedNodes.list();
  return all.filter((n) => n.is_public_for_diagnostics);
}

// Map AdminManagedNodes to the shape ServerHealthGrid/NetworkDiagnosticTool expects
export function mapNodeToServerShape(node) {
  return {
    id: node.id,
    name: node.node_name,
    service_type: node.service_type,
    status: node.node_health_status,
    region: node.assigned_region,
    ping_target_url: node.public_ping_endpoint,
    speedtest_endpoint: node.public_speedtest_endpoint,
    uptime_percentage: null,
    maintenance_window: null,
  };
}

// Build pseudo LinkedMediaAccount objects from universal identity + admin nodes
// so the existing deviceSessionApi functions can be reused without modification
export function buildAccountListFromIdentity(identity, nodes) {
  const accounts = [];

  if (identity?.plex_connected && identity?.plex_auth_token) {
    for (const node of nodes.filter((n) => n.service_type === "plex")) {
      accounts.push({
        service_type: "plex",
        server_id: node.id,
        server_url: node.internal_api_endpoint,
        auth_token: identity.plex_auth_token,
        external_user_id: identity.plex_user_uuid,
        stream_limit: node.max_concurrent_limit || 4,
      });
    }
  }

  if (identity?.emby_connected && identity?.emby_access_token) {
    for (const node of nodes.filter((n) => n.service_type === "emby")) {
      accounts.push({
        service_type: "emby",
        server_id: node.id,
        server_url: node.internal_api_endpoint,
        auth_token: identity.emby_access_token,
        external_user_id: identity.emby_user_guid,
        stream_limit: node.max_concurrent_limit || 4,
      });
    }
  }

  if (identity?.jellyfin_connected && identity?.jellyfin_access_token) {
    for (const node of nodes.filter((n) => n.service_type === "jellyfin")) {
      accounts.push({
        service_type: "jellyfin",
        server_id: node.id,
        server_url: node.internal_api_endpoint,
        auth_token: identity.jellyfin_access_token,
        external_user_id: identity.jellyfin_user_id,
        stream_limit: node.max_concurrent_limit || 4,
      });
    }
  }

  return accounts;
}

// ─── Plex OAuth PIN Flow ───

export async function createPlexPin() {
  const res = await fetch("https://plex.tv/api/v2/pins?strong=true", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "X-Plex-Product": PLEX_PRODUCT,
      "X-Plex-Version": "1.0",
      "X-Plex-Client-Identifier": PLEX_CLIENT_ID,
    },
  });
  if (!res.ok) throw new Error("Failed to create Plex PIN");
  return res.json();
}

export async function pollPlexPin(pinId) {
  const res = await fetch(`https://plex.tv/api/v2/pins/${pinId}`, {
    headers: {
      "Accept": "application/json",
      "X-Plex-Product": PLEX_PRODUCT,
      "X-Plex-Version": "1.0",
      "X-Plex-Client-Identifier": PLEX_CLIENT_ID,
    },
  });
  if (!res.ok) throw new Error("Failed to poll Plex PIN");
  return res.json();
}

export function getPlexAuthUrl(pinCode) {
  return `https://app.plex.tv/auth#?clientID=${PLEX_CLIENT_ID}&code=${pinCode}&context[device][product]=${PLEX_PRODUCT}`;
}

export async function getPlexIdentity(authToken) {
  const res = await fetch("https://plex.tv/api/v2/user", {
    headers: {
      "Accept": "application/json",
      "X-Plex-Token": authToken,
      "X-Plex-Product": PLEX_PRODUCT,
      "X-Plex-Version": "1.0",
      "X-Plex-Client-Identifier": PLEX_CLIENT_ID,
    },
  });
  if (!res.ok) throw new Error("Failed to get Plex identity");
  return res.json();
}

// ─── Emby / Jellyfin Authentication ───

export async function authenticateEmby(node, username, password) {
  const base = (node.internal_api_endpoint || "").replace(/\/$/, "");
  const authStr = `MediaBrowser Client="${PLEX_PRODUCT}", Device="Web", DeviceId="mediapass-app", Version="1.0"`;
  const res = await fetch(`${base}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Emby-Authorization": authStr,
      "Accept": "application/json",
    },
    body: JSON.stringify({ Username: username, Pw: password }),
  });
  if (!res.ok) throw new Error("Emby authentication failed — check your credentials");
  return res.json();
}

export async function authenticateJellyfin(node, username, password) {
  const base = (node.internal_api_endpoint || "").replace(/\/$/, "");
  const authStr = `MediaBrowser Client="${PLEX_PRODUCT}", Device="Web", DeviceId="mediapass-app", Version="1.0"`;
  const res = await fetch(`${base}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Emby-Authorization": authStr,
      "Accept": "application/json",
    },
    body: JSON.stringify({ Username: username, Pw: password }),
  });
  if (!res.ok) throw new Error("Jellyfin authentication failed — check your credentials");
  return res.json();
}