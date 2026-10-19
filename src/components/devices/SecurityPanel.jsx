import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, KeyRound, ShieldAlert, Bomb, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useMediaAuth } from "@/lib/MediaAuthContext";
import { resetMediaPassword, revokePlexToken, revokeAllJellyfinTokens, passwordStrength } from "@/lib/deviceSessionApi";

const strengthColors = ["bg-rose-500", "bg-amber-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];
const strengthLabels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];

async function logSecurityAction(userId, serviceType, deviceName, reason) {
  if (!userId) return;
  try {
    await base44.entities.SessionKillLog.create({
      user_id: userId,
      device_name: deviceName,
      service_type: serviceType,
      triggered_by: "Customer Self-Service",
      terminated_at: new Date().toISOString(),
      reason,
    });
  } catch {}
}

export default function SecurityPanel({ accounts, onAccountChanged }) {
  const { user } = useAuth();
  const { identity, refreshAuth } = useMediaAuth();
  const userId = user?.id;
  const embyAccount = accounts.find((a) => a.service_type === "emby");
  const jellyfinAccount = accounts.find((a) => a.service_type === "jellyfin");
  const plexAccount = accounts.find((a) => a.service_type === "plex");

  return (
    <Tabs defaultValue="emby" className="w-full">
      <TabsList className="bg-slate-900/60 border border-slate-800">
        <TabsTrigger value="emby" disabled={!embyAccount} className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400">Emby Security</TabsTrigger>
        <TabsTrigger value="jellyfin" disabled={!jellyfinAccount} className="data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400">Jellyfin Security</TabsTrigger>
        <TabsTrigger value="plex" disabled={!plexAccount} className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400">Plex Linked Access</TabsTrigger>
      </TabsList>

      <TabsContent value="emby">
        {embyAccount ? <EmbySecurity account={embyAccount} userId={userId} /> : <NoAccount service="Emby" />}
      </TabsContent>
      <TabsContent value="jellyfin">
        {jellyfinAccount ? <JellyfinSecurity account={jellyfinAccount} userId={userId} onAccountChanged={onAccountChanged} /> : <NoAccount service="Jellyfin" />}
      </TabsContent>
      <TabsContent value="plex">
        {plexAccount ? <PlexSecurity account={plexAccount} userId={userId} identity={identity} refreshAuth={refreshAuth} onAccountChanged={onAccountChanged} /> : <NoAccount service="Plex" />}
      </TabsContent>
    </Tabs>
  );
}

function PasswordStrengthBar({ password }) {
  const score = passwordStrength(password);
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? strengthColors[score - 1] : "bg-slate-700"}`} />
      ))}
      <span className="text-[10px] text-slate-500 ml-1 w-16">{password ? strengthLabels[score - 1] || "Very Weak" : ""}</span>
    </div>
  );
}

function EmbySecurity({ account, userId }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [killSessions, setKillSessions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) return;
    setSaving(true);
    try {
      await resetMediaPassword(account, newPw);
      await logSecurityAction(userId, "emby", "Security Panel", "Emby password reset via Security Panel");
      setDone(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setDone(false), 3000);
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg border border-slate-800 bg-slate-950/40">
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400">Current Password</label>
        <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required className="bg-slate-800 border-slate-700 text-slate-100" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400">New Password</label>
        <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required className="bg-slate-800 border-slate-700 text-slate-100" />
        {newPw && <PasswordStrengthBar password={newPw} />}
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400">Confirm Password</label>
        <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required className="bg-slate-800 border-slate-700 text-slate-100" />
        {newPw && confirmPw && newPw !== confirmPw && <p className="text-xs text-rose-400">Passwords do not match</p>}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <Switch checked={killSessions} onCheckedChange={setKillSessions} />
        Terminate all active Emby sessions upon password reset
      </label>
      <Button type="submit" disabled={saving || (newPw !== confirmPw)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
        {done ? <CheckCircle2 className="w-4 h-4" /> : saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        {done ? "Password Updated!" : "Reset Emby Password"}
      </Button>
    </form>
  );
}

function JellyfinSecurity({ account, userId, onAccountChanged }) {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) return;
    setSaving(true);
    try {
      await resetMediaPassword(account, newPw);
      await logSecurityAction(userId, "jellyfin", "Security Panel", "Jellyfin password reset via Security Panel");
      setDone(true); setNewPw(""); setConfirmPw("");
      setTimeout(() => setDone(false), 3000);
    } finally { setSaving(false); }
  };

  const handleRevokeAll = async () => {
    setRevoking(true);
    try {
      await revokeAllJellyfinTokens(account);
      await logSecurityAction(userId, "jellyfin", "All Devices", "All Jellyfin device tokens revoked via Security Panel");
    } finally { setRevoking(false); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleReset} className="space-y-4 p-4 rounded-lg border border-slate-800 bg-slate-950/40">
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">New Password</label>
          <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required className="bg-slate-800 border-slate-700 text-slate-100" />
          {newPw && <PasswordStrengthBar password={newPw} />}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">Confirm Password</label>
          <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required className="bg-slate-800 border-slate-700 text-slate-100" />
        </div>
        <Button type="submit" disabled={saving || (newPw !== confirmPw)} className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5">
          {done ? <CheckCircle2 className="w-4 h-4" /> : saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {done ? "Password Updated!" : "Reset Jellyfin Password"}
        </Button>
      </form>
      <div className="p-4 rounded-lg border border-rose-500/20 bg-rose-500/5">
        <p className="text-xs text-slate-400 mb-3">Force all connected devices to re-authenticate by revoking their session tokens.</p>
        <Button onClick={handleRevokeAll} disabled={revoking} variant="outline" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1.5">
          {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
          Revoke All Device Tokens
        </Button>
      </div>
    </div>
  );
}

function PlexSecurity({ account, userId, identity, refreshAuth, onAccountChanged }) {
  const [revoking, setRevoking] = useState(false);
  const [done, setDone] = useState(false);

  const handleRevoke = async () => {
    if (!confirm("This will unlink your Plex account and purge the auth token. You will need to re-authorize via Plex OAuth. Continue?")) return;
    setRevoking(true);
    try {
      await revokePlexToken(account.auth_token);
      if (identity?.id) {
        await base44.entities.UserUniversalMediaIdentity.update(identity.id, {
          plex_connected: false, plex_username: null, plex_email: null, plex_user_uuid: null, plex_auth_token: null,
        });
      }
      await logSecurityAction(userId, "plex", "Plex Auth Token", "Plex auth token revoked (nuclear) via Security Panel");
      await refreshAuth?.();
      setDone(true);
      onAccountChanged?.();
    } finally { setRevoking(false); }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-slate-800 bg-slate-950/40">
      <div className="space-y-1">
        <p className="text-xs text-slate-500">Linked Plex Username</p>
        <p className="text-sm text-white font-semibold">{identity?.plex_username || "N/A"}</p>
        {identity?.plex_email && <p className="text-xs text-slate-400">{identity.plex_email}</p>}
      </div>
      <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Bomb className="w-4 h-4 text-rose-400" />
          <p className="text-sm font-semibold text-rose-400">Nuclear Plex Revocation</p>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Use this if you suspect unauthorized streaming on your Plex account or if device sync becomes unresponsive.
          This unlinks the account, purges the bearer token, and forces re-authorization through Plex OAuth pin flow.
        </p>
        <Button onClick={handleRevoke} disabled={revoking} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
          {done ? <CheckCircle2 className="w-4 h-4" /> : revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bomb className="w-4 h-4" />}
          {done ? "Token Revoked" : "Revoke Linked Plex Auth Token"}
        </Button>
      </div>
    </div>
  );
}

function NoAccount({ service }) {
  return <p className="text-sm text-slate-500 text-center py-8">No linked {service} account found.</p>;
}