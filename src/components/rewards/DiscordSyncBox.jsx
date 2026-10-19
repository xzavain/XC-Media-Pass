import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Link2, CheckCircle2 } from "lucide-react";

export default function DiscordSyncBox({ communityProfile, currentTier, onLink, onForceSync, syncing }) {
  const [showForm, setShowForm] = useState(false);
  const [discordId, setDiscordId] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLink(discordId, discordUsername);
    setShowForm(false);
    setDiscordId("");
    setDiscordUsername("");
  };

  const isLinked = communityProfile?.is_discord_synced;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6">
      <h3 className="text-lg font-semibold text-white">Discord Community VIP Badging</h3>

      {!isLinked ? (
        <div className="mt-3">
          <p className="text-sm text-slate-400">Link your Discord account to automatically sync your VIP role in our community server.</p>
          {showForm ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <Input placeholder="Discord User ID (e.g. 123456789012345678)" value={discordId} onChange={(e) => setDiscordId(e.target.value)} required className="bg-slate-800 border-slate-700 text-slate-100" />
              <Input placeholder="Discord Username (e.g. Alex#1234)" value={discordUsername} onChange={(e) => setDiscordUsername(e.target.value)} required className="bg-slate-800 border-slate-700 text-slate-100" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                  <Link2 className="w-4 h-4" /> Link Account
                </Button>
                <Button type="button" onClick={() => setShowForm(false)} variant="outline" className="border-slate-700 text-slate-300">Cancel</Button>
              </div>
            </form>
          ) : (
            <Button onClick={() => setShowForm(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
              <Link2 className="w-4 h-4" /> Link Discord Account
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            {communityProfile.discord_avatar_url ? (
              <img src={communityProfile.discord_avatar_url} alt="" className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                {communityProfile.discord_username?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{communityProfile.discord_username || "Discord User"}</p>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Discord Synced
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <p className="text-sm text-slate-300">
              Your Discord account is synchronized. You currently hold the{" "}
              <span
                className="font-semibold px-2 py-0.5 rounded text-white"
                style={{ background: currentTier?.gradient_colors || "linear-gradient(135deg, #b45309, #78350f)" }}
              >
                @{currentTier?.discord_role_name || currentTier?.tier_name || "Bronze"}
              </span>{" "}
              role in our community server.
            </p>
          </div>
          <Button onClick={onForceSync} disabled={syncing} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> Force Sync My Roles
          </Button>
        </div>
      )}
    </div>
  );
}