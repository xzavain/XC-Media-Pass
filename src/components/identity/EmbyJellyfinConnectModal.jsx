import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Link2, Unlink, CheckCircle2 } from "lucide-react";
import { authenticateEmby, authenticateJellyfin, getAdminNodes } from "@/lib/universalIdentityApi";

export default function EmbyJellyfinConnectModal({ service, identity, onConnected, onDisconnect, trigger }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isEmby = service === "emby";
  const isConnected = isEmby ? identity?.emby_connected : identity?.jellyfin_connected;
  const accentColor = isEmby ? "#52B54B" : "#aa5cc3";
  const accentBorder = isEmby ? "border-emerald-500/30" : "border-purple-500/30";
  const accentBg = isEmby ? "bg-emerald-500/5" : "bg-purple-500/5";
  const accentText = isEmby ? "text-emerald-400" : "text-purple-400";
  const serviceLabel = service.charAt(0).toUpperCase() + service.slice(1);

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nodes = await getAdminNodes(service);
      if (nodes.length === 0) throw new Error(`No ${serviceLabel} node is configured. Please contact support.`);
      const node = nodes[0];
      const authFn = isEmby ? authenticateEmby : authenticateJellyfin;
      const data = await authFn(node, username, password);

      const updateData = isEmby
        ? { emby_connected: true, emby_username: data.User?.Name || username, emby_user_guid: data.User?.Id, emby_access_token: data.AccessToken, last_sync_timestamp: new Date().toISOString() }
        : { jellyfin_connected: true, jellyfin_username: data.User?.Name || username, jellyfin_user_id: data.User?.Id, jellyfin_access_token: data.AccessToken, last_sync_timestamp: new Date().toISOString() };

      await onConnected(updateData);
      setOpen(false);
      setUsername("");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isConnected) {
    const displayName = isEmby ? identity?.emby_username : identity?.jellyfin_username;
    return (
      <div className={`flex items-center justify-between p-4 rounded-xl border ${accentBorder} ${accentBg}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}20` }}>
            <CheckCircle2 className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{displayName || `${serviceLabel} User`}</p>
            <p className={`text-xs ${accentText}`}>🟢 {serviceLabel} Connected</p>
          </div>
        </div>
        <Button onClick={onDisconnect} variant="outline" size="sm" className={`${accentBorder} ${accentText} hover:bg-white/5 gap-1.5`}>
          <Unlink className="w-3.5 h-3.5" /> Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full gap-2 text-white" style={{ background: accentColor }}>
            <Link2 className="w-4 h-4" /> Login with {serviceLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader><DialogTitle>Login with {serviceLabel}</DialogTitle></DialogHeader>
        <form onSubmit={handleConnect} className="space-y-3">
          <div>
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required className="bg-slate-800 border-slate-700" placeholder="Your server username" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-slate-800 border-slate-700" placeholder="Your server password" />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full text-white gap-2" style={{ background: accentColor }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {loading ? "Authenticating..." : "Connect"}
          </Button>
          <p className="text-xs text-slate-500 text-center">Authenticates against the staff-configured {serviceLabel} master node</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}