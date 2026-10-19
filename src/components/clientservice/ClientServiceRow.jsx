import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { Ban, CheckCircle2, Trash2, MonitorX, KeyRound, Loader2, Film } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  suspendServerUser, reactivateServerUser, terminateServerUser,
  changeServerUserPassword, dropServerUserSessions,
} from "@/lib/clientServiceApi";
import ChangePasswordModal from "@/components/clientservice/ChangePasswordModal";

export default function ClientServiceRow({ serverUser, server, onChanged }) {
  const [busy, setBusy] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { toast } = useToast();

  const run = async (action, label) => {
    setBusy(label);
    try {
      await action();
      toast({ title: `${label} succeeded` });
      onChanged();
    } catch (err) {
      toast({ title: `${label} failed`, description: err.message, variant: "destructive" });
    } finally {
      setBusy("");
    }
  };

  const handleSuspendToggle = () => {
    if (serverUser.is_suspended) {
      run(() => reactivateServerUser(server, serverUser), "Reactivate");
    } else {
      if (!window.confirm(`Suspend access for ${serverUser.friendly_name || serverUser.username}?`)) return;
      run(() => suspendServerUser(server, serverUser), "Suspend");
    }
  };

  const handleTerminate = () => {
    if (!window.confirm(`Permanently terminate ${serverUser.friendly_name || serverUser.username}'s account? This cannot be undone.`)) return;
    run(() => terminateServerUser(server, serverUser), "Terminate");
  };

  const handleDropSessions = () => {
    run(async () => {
      const count = await dropServerUserSessions(server, serverUser);
      if (count === 0) throw new Error("No active sessions found");
    }, "Drop Sessions");
  };

  const handleChangePassword = async (password) => {
    await run(() => changeServerUserPassword(server, serverUser, password), "Change Password");
    setShowPasswordModal(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 flex-wrap">
      <PlatformBadge platform={serverUser.platform} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-200 truncate">{serverUser.friendly_name || serverUser.username}</p>
        <p className="text-xs text-zinc-500 truncate">{serverUser.server_name}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(serverUser.libraries || []).length === 0 ? (
          <span className="text-xs text-zinc-600">No access</span>
        ) : (
          serverUser.libraries.map((lib) => (
            <span key={lib.id} className="inline-flex items-center gap-1 text-xs bg-zinc-800/60 text-zinc-400 px-2 py-0.5 rounded-md">
              <Film className="w-3 h-3" /> {lib.name}
            </span>
          ))
        )}
      </div>
      {serverUser.is_suspended && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Suspended</span>
      )}
      <div className="flex gap-1.5 flex-shrink-0" disabled={!server}>
        <Button size="sm" variant="outline" disabled={!server || busy} onClick={handleSuspendToggle} className="border-zinc-700">
          {busy === "Suspend" || busy === "Reactivate" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : serverUser.is_suspended ? <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" /> : <Ban className="w-3.5 h-3.5 text-amber-400" />}
        </Button>
        <Button size="sm" variant="outline" disabled={!server || busy} onClick={handleDropSessions} className="border-zinc-700">
          {busy === "Drop Sessions" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MonitorX className="w-3.5 h-3.5" />}
        </Button>
        {serverUser.platform !== "plex" && (
          <Button size="sm" variant="outline" disabled={!server || busy} onClick={() => setShowPasswordModal(true)} className="border-zinc-700">
            <KeyRound className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={!server || busy} onClick={handleTerminate} className="border-zinc-700 text-red-400 hover:text-red-300">
          {busy === "Terminate" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handleChangePassword}
      />
    </div>
  );
}