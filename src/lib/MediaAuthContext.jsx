import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getOrCreateUniversalIdentity, getAdminNodes, buildAccountListFromIdentity } from "@/lib/universalIdentityApi";

const MediaAuthContext = createContext(null);

export function MediaAuthProvider() {
  const { user } = useAuth();
  const [identity, setIdentity] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    if (!user) return;
    try {
      const [id, nodeList] = await Promise.all([
        getOrCreateUniversalIdentity(user),
        getAdminNodes(),
      ]);
      setIdentity(id);
      setNodes(nodeList);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { refreshAuth(); }, [refreshAuth]);

  const accounts = identity ? buildAccountListFromIdentity(identity, nodes) : [];
  const isAnyConnected = !!(identity?.plex_connected || identity?.emby_connected || identity?.jellyfin_connected);
  const connectedCount = [identity?.plex_connected, identity?.emby_connected, identity?.jellyfin_connected].filter(Boolean).length;

  const value = {
    identity,
    nodes,
    accounts,
    isAnyConnected,
    connectedCount,
    isLoading,
    refreshAuth,
    plex: {
      isConnected: identity?.plex_connected || false,
      token: identity?.plex_auth_token || null,
      userUuid: identity?.plex_user_uuid || null,
      username: identity?.plex_username || null,
    },
    emby: {
      isConnected: identity?.emby_connected || false,
      token: identity?.emby_access_token || null,
      userGuid: identity?.emby_user_guid || null,
      username: identity?.emby_username || null,
      defaultServerId: nodes.find((n) => n.service_type === "emby")?.id || null,
    },
    jellyfin: {
      isConnected: identity?.jellyfin_connected || false,
      token: identity?.jellyfin_access_token || null,
      userId: identity?.jellyfin_user_id || null,
      username: identity?.jellyfin_username || null,
      defaultServerId: nodes.find((n) => n.service_type === "jellyfin")?.id || null,
    },
  };

  return <MediaAuthContext.Provider value={value}><Outlet /></MediaAuthContext.Provider>;
}

export function useMediaAuth() {
  const ctx = useContext(MediaAuthContext);
  if (!ctx) throw new Error("useMediaAuth must be used within MediaAuthProvider");
  return ctx;
}