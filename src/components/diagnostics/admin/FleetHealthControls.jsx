import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ServerCog } from "lucide-react";
import NodePlatformBadge from "../NodePlatformBadge";

const statusOptions = [
  { value: "operational", label: "Operational", color: "text-emerald-400" },
  { value: "degraded", label: "Degraded", color: "text-amber-400" },
  { value: "maintenance", label: "Maintenance", color: "text-indigo-400" },
  { value: "offline", label: "Offline", color: "text-rose-400" },
];

const emptyForm = { name: "", service_type: "plex", region: "", ping_target_url: "", status: "operational", uptime_percentage: 99.9, maintenance_window: "" };

export default function FleetHealthControls({ servers, onServersChanged }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newServer, setNewServer] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleStatusChange = async (server, status) => {
    await base44.entities.Server.update(server.id, { status });
    onServersChanged?.();
  };

  const handleMaintenanceWindow = async (server, window) => {
    await base44.entities.Server.update(server.id, { maintenance_window: window });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Server.create(newServer);
      setNewServer(emptyForm);
      setShowAdd(false);
      onServersChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (server) => {
    await base44.entities.Server.delete(server.id);
    onServersChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <ServerCog className="w-4 h-4 text-lime-400" /> Fleet Health Controls
        </h3>
        <Button onClick={() => setShowAdd(!showAdd)} variant="outline" className="border-zinc-700 text-zinc-200 gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add Node
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input required placeholder="Node name (e.g. XC-Foxtrot)" value={newServer.name} onChange={(e) => setNewServer((s) => ({ ...s, name: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
            <Select value={newServer.service_type} onValueChange={(v) => setNewServer((s) => ({ ...s, service_type: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="plex">Plex</SelectItem><SelectItem value="emby">Emby</SelectItem><SelectItem value="jellyfin">Jellyfin</SelectItem>
                <SelectItem value="downloader_sabnzbd">SABnzbd</SelectItem><SelectItem value="downloader_qbittorrent">qBittorrent</SelectItem><SelectItem value="backend_api">Backend API</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Region (e.g. US-East (Virginia))" value={newServer.region} onChange={(e) => setNewServer((s) => ({ ...s, region: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
            <Input placeholder="Ping target URL (https://...)" value={newServer.ping_target_url} onChange={(e) => setNewServer((s) => ({ ...s, ping_target_url: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
          </div>
          <Button type="submit" disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white">
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Create Node
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {servers.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 flex-wrap">
            <NodePlatformBadge serviceType={s.service_type} name={s.name} size="sm" />
            <span className="text-xs text-zinc-500 flex-1 truncate">{s.region || "No region"}</span>
            <Select value={s.status} onValueChange={(v) => handleStatusChange(s, v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {statusOptions.map((o) => (<SelectItem key={o.value} value={o.value} className={o.color}>{o.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Input placeholder="Maintenance window" value={s.maintenance_window || ""} onChange={(e) => handleMaintenanceWindow(s, e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 h-8 w-[200px] text-xs" />
            <button onClick={() => handleDelete(s)} className="text-zinc-600 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {servers.length === 0 && <p className="text-xs text-zinc-500 text-center py-4">No nodes configured. Click "Add Node" to create one.</p>}
      </div>
    </div>
  );
}