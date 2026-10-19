import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, RefreshCw, Loader2, Pencil, Film, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlatformBadge from "@/components/shared/PlatformBadge";
import EditServerUserModal from "@/components/servers/EditServerUserModal";
import { syncServerUsers } from "@/lib/serverUsersApi";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

function groupKey(u) {
  return (u.email || u.username || "").toLowerCase().trim();
}

export default function ServerUsers() {
  const [servers, setServers] = useState([]);
  const [serverUsers, setServerUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(null); // { serverUser, server }
  const [activeServerId, setActiveServerId] = useState("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadAll = async () => {
    const [srv, users] = await Promise.all([
      base44.entities.MediaServer.list(),
      base44.entities.ServerUser.list(),
    ]);
    setServers(srv);
    setServerUsers(users);
    setLoading(false);
    return srv;
  };

  // Auto-refresh every 6 hours: on page load (and on a recurring check while
  // the page stays open) silently sync any server whose users were last synced
  // more than 6 hours ago (or never). Sync All remains a separate manual action.
  useEffect(() => {
    let interval;
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const runAutoSync = async () => {
      const srv = await base44.entities.MediaServer.list();
      const stale = srv.filter((s) => {
        if (!s.users_last_synced) return true;
        return Date.now() - new Date(s.users_last_synced).getTime() > SIX_HOURS_MS;
      });
      if (!stale.length) return;
      for (const server of stale) {
        try { await syncServerUsers(server); } catch (err) { console.error(`Auto-sync failed for ${server.name}`, err); }
      }
      await loadAll();
    };
    (async () => {
      await loadAll();
      await runAutoSync();
      interval = setInterval(runAutoSync, 5 * 60 * 1000);
    })();
    return () => clearInterval(interval);
  }, []);

  const syncServers = async (targets) => {
    for (const server of targets) {
      try {
        await syncServerUsers(server);
      } catch (err) {
        toast({ title: `Sync failed for ${server.name}`, description: err.message, variant: "destructive" });
      }
    }
    await loadAll();
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await syncServers(servers);
      toast({ title: "Users synced" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncServer = async (server) => {
    setSyncing(true);
    try {
      await syncServers([server]);
      toast({ title: `${server.name} synced` });
    } finally {
      setSyncing(false);
    }
  };

  const serverById = Object.fromEntries(servers.map((s) => [s.id, s]));
  const filteredUsers = activeServerId === "all" ? serverUsers : serverUsers.filter((u) => u.server_id === activeServerId);

  const groups = {};
  for (const u of filteredUsers) {
    const key = groupKey(u) || u.id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(u);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-lime-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100">Server Users</h1>
          <p className="text-sm text-zinc-500 mt-1">All users across your connected Plex, Emby, and Jellyfin servers</p>
        </div>
        <Button onClick={handleSyncAll} disabled={syncing || servers.length === 0} className="bg-lime-600 hover:bg-lime-700 text-white gap-2">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync All
        </Button>
      </div>

      {/* Server filter tabs */}
      {servers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveServerId("all")}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${activeServerId === "all" ? "bg-lime-500/10 text-lime-400 border-lime-500/20" : "border-zinc-800 text-zinc-400 hover:bg-zinc-800/50"}`}
          >
            All Servers
          </button>
          {servers.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${activeServerId === s.id ? "bg-lime-500/10 text-lime-400 border-lime-500/20" : "border-zinc-800 text-zinc-400 hover:bg-zinc-800/50"}`}
            >
              <button onClick={() => setActiveServerId(s.id)} className="flex items-center gap-2">
                <PlatformBadge platform={s.platform} />
                {s.name}
                <span className="text-xs text-zinc-600">
                  · synced {s.users_last_synced ? moment(s.users_last_synced).fromNow() : "never"}
                </span>
              </button>
              <button
                onClick={() => handleSyncServer(s)}
                disabled={syncing}
                title={`Sync ${s.name} now`}
                className="ml-1 p-1 rounded text-zinc-500 hover:text-lime-400 hover:bg-zinc-800/60 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {Object.keys(groups).length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-zinc-300 font-medium">No users found</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-4">Click Sync All to pull user lists from your connected servers</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {Object.values(groups).map((group) => {
            const displayName = group.find((u) => u.friendly_name)?.friendly_name || group[0].username;
            return (
              <div key={group[0].id} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                <h3 className="font-semibold text-zinc-200 mb-3">{displayName}</h3>
                <div className="space-y-2">
                  {group.map((u) => {
                    const server = serverById[u.server_id];
                    return (
                      <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/30">
                        <PlatformBadge platform={u.platform} />
                        <span className="text-sm text-zinc-400 truncate flex-1">{u.server_name}</span>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {(u.libraries || []).length === 0 ? (
                            <span className="text-xs text-zinc-600">No access</span>
                          ) : (
                            u.libraries.map((lib) => (
                              <span key={lib.id} className="inline-flex items-center gap-1 text-xs bg-zinc-800/60 text-zinc-400 px-2 py-0.5 rounded-md">
                                <Film className="w-3 h-3" /> {lib.name}
                              </span>
                            ))
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/server-users/${u.id}`)}
                          className="text-zinc-400 hover:text-lime-400 hover:bg-zinc-800 flex-shrink-0"
                          title="View profile"
                        >
                          <User className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!server}
                          onClick={() => setEditing({ serverUser: u, server })}
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex-shrink-0"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditServerUserModal
        serverUser={editing?.serverUser}
        server={editing?.server}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        onSaved={loadAll}
      />
    </div>
  );
}