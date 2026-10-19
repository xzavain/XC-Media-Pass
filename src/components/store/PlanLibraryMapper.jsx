import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import PlatformBadge from "@/components/shared/PlatformBadge";

// Lets an admin pick which libraries, per connected media server, this plan grants access to.
export default function PlanLibraryMapper({ libraryMap, onChange }) {
  const [servers, setServers] = useState([]);

  useEffect(() => {
    base44.entities.MediaServer.list().then(setServers);
  }, []);

  const idsForServer = (serverId) => new Set(libraryMap.find((m) => m.server_id === serverId)?.library_ids || []);

  const toggleLibrary = (serverId, libraryId) => {
    const current = idsForServer(serverId);
    current.has(libraryId) ? current.delete(libraryId) : current.add(libraryId);
    const nextIds = Array.from(current);
    const rest = libraryMap.filter((m) => m.server_id !== serverId);
    onChange(nextIds.length ? [...rest, { server_id: serverId, library_ids: nextIds }] : rest);
  };

  if (servers.length === 0) {
    return <p className="text-xs text-zinc-400">No connected servers yet — add one on the Servers page to map libraries.</p>;
  }

  return (
    <div className="space-y-3">
      <Label>Library Access</Label>
      <div className="space-y-3 max-h-56 overflow-y-auto border border-zinc-800 rounded-lg p-3">
        {servers.map((server) => (
          <div key={server.id}>
            <div className="flex items-center gap-2 mb-1.5">
              <PlatformBadge platform={server.platform} />
              <span className="text-sm text-zinc-200">{server.name}</span>
            </div>
            {(server.libraries || []).length === 0 ? (
              <p className="text-xs text-zinc-500 pl-1">No libraries synced for this server.</p>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-1">
                {server.libraries.map((lib) => (
                  <label key={lib.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={idsForServer(server.id).has(lib.id)}
                      onCheckedChange={() => toggleLibrary(server.id, lib.id)}
                    />
                    <span className="text-sm text-zinc-300">{lib.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}