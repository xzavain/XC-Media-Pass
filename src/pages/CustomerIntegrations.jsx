import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useMediaAuth } from "@/lib/MediaAuthContext";
import { Loader2, Link2, AlertCircle, ShieldCheck } from "lucide-react";
import PlexOAuthButton from "@/components/identity/PlexOAuthButton";
import EmbyJellyfinConnectModal from "@/components/identity/EmbyJellyfinConnectModal";
import DiscordConnectTile from "@/components/rewards/DiscordConnectTile";
import { getOrCreateCommunityProfile } from "@/lib/rewardsApi";

export default function CustomerIntegrations() {
  const { user } = useAuth();
  const { identity, nodes, refreshAuth, isLoading: authLoading } = useMediaAuth();
  const [communityProfile, setCommunityProfile] = useState(null);
  const [currentTier, setCurrentTier] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [cp, tierList] = await Promise.all([
      getOrCreateCommunityProfile(user),
      base44.entities.LoyaltyTier.list("tier_rank", 50),
    ]);
    setCommunityProfile(cp);
    setCurrentTier(tierList.find((t) => t.id === cp.current_tier_id) || tierList.find((t) => (t.tier_rank || 0) === 0) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleConnected = async (data) => {
    await base44.entities.UserUniversalMediaIdentity.update(identity.id, data);
    const service = data.plex_connected ? "plex" : data.emby_connected ? "emby" : data.jellyfin_connected ? "jellyfin" : null;
    if (service && user) {
      await base44.entities.SessionKillLog.create({
        user_id: user.id, device_name: "Auth Handshake", service_type: service,
        triggered_by: "Customer Self-Service", terminated_at: new Date().toISOString(),
        reason: `${service.charAt(0).toUpperCase() + service.slice(1)} account linked`,
      }).catch(() => {});
    }
    await refreshAuth();
  };

  const handleDisconnect = async (service) => {
    const updateData = service === "plex"
      ? { plex_connected: false, plex_username: null, plex_email: null, plex_user_uuid: null, plex_auth_token: null }
      : service === "emby"
      ? { emby_connected: false, emby_username: null, emby_user_guid: null, emby_access_token: null }
      : { jellyfin_connected: false, jellyfin_username: null, jellyfin_user_id: null, jellyfin_access_token: null };
    await base44.entities.UserUniversalMediaIdentity.update(identity.id, updateData);
    if (user) {
      await base44.entities.SessionKillLog.create({
        user_id: user.id, device_name: "Auth Handshake", service_type: service,
        triggered_by: "Customer Self-Service", terminated_at: new Date().toISOString(),
        reason: `${service.charAt(0).toUpperCase() + service.slice(1)} account disconnected`,
      }).catch(() => {});
    }
    await refreshAuth();
  };

  if (loading || authLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;
  }

  const anyConnected = identity?.plex_connected || identity?.emby_connected || identity?.jellyfin_connected;
  const availableServices = nodes.length > 0 ? [...new Set(nodes.map((n) => n.service_type))] : [];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
          <Link2 className="w-6 h-6 text-indigo-400" /> Connect Media Servers
        </h1>
        <p className="text-sm text-slate-500 mt-1">Connect your media accounts once — all portal features sync automatically</p>
      </div>

      {/* Persistent connection banner */}
      {!anyConnected && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">No Media Accounts Linked</p>
            <p className="text-xs text-amber-200 mt-1">Connect at least one service below to unlock Diagnostics, Stream Manager, Universal Watchlist, and Release Calendar alerts. Your token persists globally — you never need to re-authenticate inside individual pages.</p>
          </div>
        </div>
      )}

      {/* Service connection cards */}
      <div className="space-y-4">
        {/* Plex */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Plex Media Server</h3>
              <p className="text-xs text-slate-500">OAuth via plex.tv — secure PIN flow</p>
            </div>
            <div className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{ background: "#e5a00d" }}>Plex</div>
          </div>
          <PlexOAuthButton identity={identity} onConnected={handleConnected} onDisconnect={() => handleDisconnect("plex")} />
        </div>

        {/* Emby */}
        {availableServices.includes("emby") && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Emby Media Server</h3>
                <p className="text-xs text-slate-500">Authenticate against staff-configured Emby node</p>
              </div>
              <div className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{ background: "#52B54B" }}>Emby</div>
            </div>
            <EmbyJellyfinConnectModal service="emby" identity={identity} onConnected={handleConnected} onDisconnect={() => handleDisconnect("emby")} />
          </div>
        )}

        {/* Jellyfin */}
        {availableServices.includes("jellyfin") && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Jellyfin Media Server</h3>
                <p className="text-xs text-slate-500">Authenticate against staff-configured Jellyfin node</p>
              </div>
              <div className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{ background: "#aa5cc3" }}>Jellyfin</div>
            </div>
            <EmbyJellyfinConnectModal service="jellyfin" identity={identity} onConnected={handleConnected} onDisconnect={() => handleDisconnect("jellyfin")} />
          </div>
        )}
      </div>

      {/* Discord Community Integration */}
      <DiscordConnectTile communityProfile={communityProfile} currentTier={currentTier} onProfileUpdate={setCommunityProfile} />

      {/* Universal persistence note */}
      <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-300 leading-relaxed">
            <strong>Universal State Persistence:</strong> Once linked, all features — Device Kill, Diagnostics, Watchlist Sync, Release Calendar alerts — automatically pull this token. You never re-authenticate inside individual sub-pages.
          </p>
        </div>
      </div>
    </div>
  );
}