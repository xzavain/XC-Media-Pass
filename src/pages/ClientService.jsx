import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users } from "lucide-react";
import ClientServiceRow from "@/components/clientservice/ClientServiceRow";

function groupKey(u) {
  return (u.email || u.username || "").toLowerCase().trim();
}

export default function ClientService() {
  const [servers, setServers] = useState([]);
  const [serverUsers, setServerUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    const [srv, users] = await Promise.all([
      base44.entities.MediaServer.list(),
      base44.entities.ServerUser.list(),
    ]);
    setServers(srv);
    setServerUsers(users);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const serverById = Object.fromEntries(servers.map((s) => [s.id, s]));

  const groups = {};
  for (const u of serverUsers) {
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
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">Client Service</h1>
        <p className="text-sm text-zinc-500 mt-1">Suspend, terminate, drop sessions, or change credentials for any server user</p>
      </div>

      {Object.keys(groups).length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-zinc-300 font-medium">No users found</h3>
          <p className="text-sm text-zinc-500 mt-1">Sync server users from the Server Users page first</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {Object.values(groups).map((group) => {
            const displayName = group.find((u) => u.friendly_name)?.friendly_name || group[0].username;
            return (
              <div key={group[0].id} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
                <h3 className="font-semibold text-zinc-200 mb-3">{displayName}</h3>
                <div className="space-y-2">
                  {group.map((u) => (
                    <ClientServiceRow
                      key={u.id}
                      serverUser={u}
                      server={serverById[u.server_id]}
                      onChanged={loadAll}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}