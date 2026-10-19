import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlatformBadge from "@/components/shared/PlatformBadge";

// Reactive service -> server cascading dropdown.
// Services are derived from the distinct platforms of connected MediaServer records,
// and servers are filtered live as new MediaServer entries are added - no hardcoding.
export default function ServiceServerSelect({ service, serverId, onChange }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.MediaServer.list().then((list) => {
      setServers(list);
      setLoading(false);
    });
  }, []);

  const services = [...new Set(servers.map((s) => s.platform))];
  const filteredServers = servers.filter((s) => s.platform === service);

  const handleServiceChange = (value) => {
    onChange({ service: value, serverId: "", serverName: "" });
  };

  const handleServerChange = (value) => {
    const srv = filteredServers.find((s) => s.id === value);
    onChange({ service, serverId: value, serverName: srv?.name || "" });
  };

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300">Service</label>
        <Select value={service} onValueChange={handleServiceChange} disabled={loading}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
            <SelectValue placeholder={loading ? "Loading..." : "Select a service"} />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {services.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <PlatformBadge platform={s} />
                </span>
              </SelectItem>
            ))}
            {!services.length && !loading && (
              <div className="px-3 py-2 text-xs text-zinc-500">No services available</div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300">Server</label>
        <Select value={serverId} onValueChange={handleServerChange} disabled={!service}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
            <SelectValue placeholder={service ? "Select a server" : "Select a service first"} />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {filteredServers.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
            {service && !filteredServers.length && (
              <div className="px-3 py-2 text-xs text-zinc-500">No servers for this service</div>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}