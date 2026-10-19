import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Pencil, Film } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { syncServerUsers } from "@/lib/serverUsersApi";
import { useToast } from "@/components/ui/use-toast";
import EditServerUserModal from "@/components/servers/EditServerUserModal";

export default function ServerUsersModal({ server, open, onOpenChange }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { toast } = useToast();

  const loadUsers = async () => {
    const data = await base44.entities.ServerUser.filter({ server_id: server.id });
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    if (open && server) {
      setLoading(true);
      loadUsers();
    }
  }, [open, server]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncServerUsers(server);
      await loadUsers();
      toast({ title: "Users synced" });
    } catch (err) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  if (!server) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>Users on {server.name}</span>
            <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              {syncing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
              Sync
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-8">
              No users found. Click Sync to pull the current user list from this server.
            </p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/60 bg-zinc-900/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{u.friendly_name || u.username}</p>
                  <p className="text-xs text-zinc-500 truncate">{u.username}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(u.libraries || []).length === 0 ? (
                      <span className="text-xs text-zinc-600">No library access</span>
                    ) : (
                      u.libraries.map((lib) => (
                        <span key={lib.id} className="inline-flex items-center gap-1 text-xs bg-zinc-800/60 text-zinc-400 px-2 py-0.5 rounded-md">
                          <Film className="w-3 h-3" /> {lib.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingUser(u)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex-shrink-0">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>

      <EditServerUserModal
        serverUser={editingUser}
        server={server}
        open={!!editingUser}
        onOpenChange={(v) => !v && setEditingUser(null)}
        onSaved={loadUsers}
      />
    </Dialog>
  );
}