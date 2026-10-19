import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, RefreshCw, Unlink, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { initiateDiscordOAuth, handleDiscordCallback, assignDiscordRole, removeDiscordRole } from "@/lib/discordOAuthApi";

export default function DiscordConnectTile({ communityProfile, currentTier, onProfileUpdate }) {
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);
  const popupCheckRef = useRef(null);

  const isLinked = communityProfile?.is_discord_synced;

  const handleMessage = useCallback(async (event) => {
    if (event.data?.type === "DISCORD_LINKED_SUCCESS") {
      setConnecting(false);
      clearInterval(popupCheckRef.current);
      try {
        const discordData = await handleDiscordCallback(event.data.accessToken, event.data.state);
        // Assign tier role
        if (currentTier?.discord_role_id) {
          await assignDiscordRole(discordData.discord_user_id, currentTier.discord_role_id).catch(() => {});
        }
        // Persist to UserCommunityProfile
        const updated = await base44.entities.UserCommunityProfile.update(communityProfile.id, {
          ...discordData,
          current_tier_id: currentTier?.id || null,
        });
        onProfileUpdate?.(updated);
        toast({ title: "Discord successfully linked!", description: `Connected as @${discordData.discord_username}` });
      } catch (err) {
        setError(err.message || "Failed to link Discord account.");
        toast({ variant: "destructive", title: "Discord linking failed", description: err.message });
      }
    } else if (event.data?.type === "DISCORD_LINKED_ERROR") {
      setConnecting(false);
      clearInterval(popupCheckRef.current);
      setError(event.data.error || "Authorization was cancelled or failed.");
      toast({ variant: "destructive", title: "Discord linking failed", description: event.data.error });
    }
  }, [communityProfile, currentTier, onProfileUpdate, toast]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (popupCheckRef.current) clearInterval(popupCheckRef.current);
    };
  }, [handleMessage]);

  const handleConnect = async () => {
    setError(null);
    setConnecting(true);
    try {
      const popup = await initiateDiscordOAuth();
      popupRef.current = popup;
      // Check if popup was closed by user (no message received)
      popupCheckRef.current = setInterval(() => {
        if (popup.closed) {
          setConnecting(false);
          clearInterval(popupCheckRef.current);
        }
      }, 1000);
    } catch (err) {
      setConnecting(false);
      setError(err.message);
      toast({ variant: "destructive", title: "Could not start Discord OAuth", description: err.message });
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      if (currentTier?.discord_role_id && communityProfile?.discord_user_id) {
        await assignDiscordRole(communityProfile.discord_user_id, currentTier.discord_role_id);
      }
      const updated = await base44.entities.UserCommunityProfile.update(communityProfile.id, {
        is_discord_synced: true,
        current_tier_id: currentTier?.id || null,
      });
      onProfileUpdate?.(updated);
      toast({ title: "Roles force-synced", description: `@${currentTier?.discord_role_name || currentTier?.tier_name} role applied.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Role sync failed", description: err.message });
    } finally { setSyncing(false); }
  };

  const handleUnlink = async () => {
    try {
      if (currentTier?.discord_role_id && communityProfile?.discord_user_id) {
        await removeDiscordRole(communityProfile.discord_user_id, currentTier.discord_role_id).catch(() => {});
      }
      const updated = await base44.entities.UserCommunityProfile.update(communityProfile.id, {
        discord_user_id: null,
        discord_username: null,
        discord_avatar_url: null,
        is_discord_synced: false,
      });
      onProfileUpdate?.(updated);
      toast({ title: "Discord account unlinked", description: "VIP roles and community perks removed." });
    } catch (err) {
      toast({ variant: "destructive", title: "Unlink failed", description: err.message });
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#5865F2" }}>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.25-.34.52-.46.78a13.1 13.1 0 0 0-3.94 0c-.12-.26-.28-.53-.46-.78a.09.09 0 0 0-.07-.03c-1.5.26-2.94.71-4.27 1.33a.08.08 0 0 0-.04.03C2.86 9.34 2.25 13.24 2.55 17.1a.1.1 0 0 0 .04.07c1.8 1.32 3.54 2.12 5.25 2.65a.1.1 0 0 0 .1-.04c.4-.55.76-1.13 1.07-1.74a.1.1 0 0 0-.05-.13c-.57-.22-1.11-.48-1.64-.79a.1.1 0 0 1-.01-.16c.11-.08.22-.17.33-.25a.08.08 0 0 1 .08-.01c3.44 1.57 7.15 1.57 10.55 0a.08.08 0 0 1 .08.01c.11.08.22.17.33.25a.1.1 0 0 1-.01.16c-.52.31-1.07.57-1.64.79a.1.1 0 0 0-.05.13c.32.61.68 1.19 1.07 1.74a.1.1 0 0 0 .1.04c1.72-.53 3.46-1.33 5.26-2.65a.1.1 0 0 0 .04-.07c.36-4.46-.62-8.34-3.06-11.74a.07.07 0 0 0-.04-.03zM8.52 14.72c-1.03 0-1.88-.95-1.88-2.12s.83-2.12 1.88-2.12c1.06 0 1.9.96 1.88 2.12 0 1.17-.83 2.12-1.88 2.12zm6.97 0c-1.03 0-1.88-.95-1.88-2.12s.83-2.12 1.88-2.12c1.06 0 1.9.96 1.88 2.12 0 1.17-.82 2.12-1.88 2.12z"/></svg>
            </span>
            Discord Community
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">VIP role sync & subscriber-only channels</p>
        </div>
        {isLinked && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
          </span>
        )}
      </div>

      {!isLinked ? (
        /* State A: Unlinked */
        <div className="space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            Authorizes in a secure new tab. Unlocks subscriber-only channels, auto-syncs VIP roles, and enables release notifications.
          </p>
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: "#5865F2" }}
          >
            {connecting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Connecting to Discord...</>
            ) : (
              <><svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.25-.34.52-.46.78a13.1 13.1 0 0 0-3.94 0c-.12-.26-.28-.53-.46-.78a.09.09 0 0 0-.07-.03c-1.5.26-2.94.71-4.27 1.33a.08.08 0 0 0-.04.03C2.86 9.34 2.25 13.24 2.55 17.1a.1.1 0 0 0 .04.07c1.8 1.32 3.54 2.12 5.25 2.65a.1.1 0 0 0 .1-.04c.4-.55.76-1.13 1.07-1.74a.1.1 0 0 0-.05-.13c-.57-.22-1.11-.48-1.64-.79a.1.1 0 0 1-.01-.16c.11-.08.22-.17.33-.25a.08.08 0 0 1 .08-.01c3.44 1.57 7.15 1.57 10.55 0a.08.08 0 0 1 .08.01c.11.08.22.17.33.25a.1.1 0 0 1-.01.16c-.52.31-1.07.57-1.64.79a.1.1 0 0 0-.05.13c.32.61.68 1.19 1.07 1.74a.1.1 0 0 0 .1.04c1.72-.53 3.46-1.33 5.26-2.65a.1.1 0 0 0 .04-.07c.36-4.46-.62-8.34-3.06-11.74a.07.07 0 0 0-.04-.03zM8.52 14.72c-1.03 0-1.88-.95-1.88-2.12s.83-2.12 1.88-2.12c1.06 0 1.9.96 1.88 2.12 0 1.17-.83 2.12-1.88 2.12zm6.97 0c-1.03 0-1.88-.95-1.88-2.12s.83-2.12 1.88-2.12c1.06 0 1.9.96 1.88 2.12 0 1.17-.82 2.12-1.88 2.12z"/></svg> Connect with Discord</>
            )}
          </button>
        </div>
      ) : (
        /* State B: Successfully Linked */
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            {communityProfile.discord_avatar_url ? (
              <img src={communityProfile.discord_avatar_url} alt="" className="w-12 h-12 rounded-full border-2 border-[#5865F2]/40" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold">
                {communityProfile.discord_username?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">@{communityProfile.discord_username || "Unknown"}</p>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active in Community Server
              </p>
            </div>
          </div>

          {/* Assigned Role Chip */}
          {currentTier && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-500">Assigned Role:</span>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded text-white"
                style={{ background: currentTier.gradient_colors?.includes("linear-gradient") ? undefined : currentTier.gradient_colors || "#5865F2" }}
              >
                {currentTier.gradient_colors?.includes("linear-gradient") ? (
                  <span style={{ background: currentTier.gradient_colors, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    @{currentTier.discord_role_name || currentTier.tier_name}
                  </span>
                ) : (
                  `@${currentTier.discord_role_name || currentTier.tier_name}`
                )}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleForceSync} disabled={syncing} variant="outline" className="flex-1 border-slate-700 text-slate-200 hover:bg-slate-800 gap-1.5 text-sm">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} /> Force Sync Roles
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1.5 text-sm">
                  <Unlink className="w-3.5 h-3.5" /> Unlink
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-950 border-slate-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-zinc-100">Unlink Discord Account?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    Your community VIP perks and Discord roles will be removed. You can reconnect at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUnlink} className="bg-rose-600 hover:bg-rose-700 text-white">Unlink Account</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}