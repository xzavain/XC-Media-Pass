import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Server, Plus, Trash2, Loader2, HardDrive, Megaphone, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import FleetNodeFormModal from "@/components/fleet/FleetNodeFormModal";
import FleetTelemetryMonitor from "@/components/fleet/FleetTelemetryMonitor";
import ConnectedServersSection from "@/components/servers/ConnectedServersSection";
import { useToast } from "@/components/ui/use-toast";

const serviceColors = {
  plex: { bg: "#e5a00d", label: "Plex" },
  emby: { bg: "#52B54B", label: "Emby" },
  jellyfin: { bg: "#aa5cc3", label: "Jellyfin" },
};

const statusColors = {
  operational: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  degraded: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  maintenance: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  offline: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export default function Servers() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertForm, setAlertForm] = useState({ server_id: "", severity: "info", title: "", message: "" });
  const [postingAlert, setPostingAlert] = useState(false);
  const { toast } = useToast();

  const loadNodes = useCallback(async () => {
    try {
      const data = await base44.entities.AdminManagedNodes.list();
      setNodes(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadNodes(); }, [loadNodes]);

  const handleStatusChange = async (node, newStatus) => {
    await base44.entities.AdminManagedNodes.update(node.id, { node_health_status: newStatus });
    loadNodes();
  };

  const handleDelete = async (node) => {
    await base44.entities.AdminManagedNodes.delete(node.id);
    toast({ title: "Node removed" });
    loadNodes();
  };

  const handlePostAlert = async (e) => {
    e.preventDefault();
    setPostingAlert(true);
    try {
      await base44.entities.ServerAlert.create({
        server_id: alertForm.server_id || "",
        is_all_servers: !alertForm.server_id,
        severity: alertForm.severity,
        title: alertForm.title,
        message: alertForm.message,
        is_active: true,
        start_time: new Date().toISOString(),
      });
      toast({ title: "Alert broadcast to customer portals" });
      setShowAlertForm(false);
      setAlertForm({ server_id: "", severity: "info", title: "", message: "" });
    } finally { setPostingAlert(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-zinc-700 border-t-indigo-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100">Fleet Node Manager</h1>
          <p className="text-sm text-slate-500 mt-1">Manage media server nodes, broadcast status, and monitor direct-play compliance</p>
        </div>
        <Button onClick={() => { setEditNode(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Node
        </Button>
      </div>

      {/* Connected Media Servers — the actual Plex/Emby/Jellyfin instances */}
      <ConnectedServersSection />

      {/* Global Telemetry */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-400" /> Global Telemetry & Direct Play Compliance</h2>
        <FleetTelemetryMonitor />
      </section>

      {/* Fleet Node Registry */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2"><Server className="w-5 h-5 text-indigo-400" /> Fleet Node Registry ({nodes.length})</h2>
        {!nodes.length ? (
          <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center">
            <Server className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-slate-300 font-medium">No fleet nodes configured</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">Add Plex, Emby, or Jellyfin nodes to expose them to customers</p>
            <Button onClick={() => { setEditNode(null); setShowForm(true); }} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" /> Add Node
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {nodes.map((node) => {
              const sc = serviceColors[node.service_type] || serviceColors.plex;
              const st = statusColors[node.node_health_status] || statusColors.operational;
              return (
                <div key={node.id} className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${sc.bg}20` }}>
                      <HardDrive className="w-5 h-5" style={{ color: sc.bg }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-zinc-200">{node.node_name}</h3>
                        <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: sc.bg }}>{sc.label}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${st}`}>{node.node_health_status}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{node.assigned_region || "No region set"} · Limit: {node.max_concurrent_limit || 4}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={node.node_health_status} onValueChange={(v) => handleStatusChange(node, v)}>
                        <SelectTrigger className="w-36 h-8 bg-slate-800 border-slate-700 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="degraded">Degraded</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => { setEditNode(node); setShowForm(true); }} className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs">Edit</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-slate-700 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-950 border-slate-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-zinc-100">Remove {node.node_name}?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">This will remove the node from the fleet. Customers will no longer see it in diagnostics.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(node)} className="bg-rose-600 hover:bg-rose-700 text-white">Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Alert Announcement Composer */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2"><Megaphone className="w-5 h-5 text-indigo-400" /> Status Broadcast System</h2>
          <Button onClick={() => setShowAlertForm(!showAlertForm)} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 text-sm gap-1.5">
            <Megaphone className="w-3.5 h-3.5" /> {showAlertForm ? "Cancel" : "Compose Alert"}
          </Button>
        </div>
        {showAlertForm && (
          <form onSubmit={handlePostAlert} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Target Node</Label>
                <Select value={alertForm.server_id} onValueChange={(v) => setAlertForm((f) => ({ ...f, server_id: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue placeholder="All Nodes" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value={null}>All Nodes</SelectItem>
                    {nodes.map((n) => <SelectItem key={n.id} value={n.id}>{n.node_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={alertForm.severity} onValueChange={(v) => setAlertForm((f) => ({ ...f, severity: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={alertForm.title} onChange={(e) => setAlertForm((f) => ({ ...f, title: e.target.value }))} required className="bg-slate-800 border-slate-700" placeholder="Scheduled Maintenance Window" />
            </div>
            <div>
              <Label>Message</Label>
              <Input value={alertForm.message} onChange={(e) => setAlertForm((f) => ({ ...f, message: e.target.value }))} required className="bg-slate-800 border-slate-700" placeholder="This node will be offline for 2 hours..." />
            </div>
            <Button type="submit" disabled={postingAlert} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              {postingAlert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} Broadcast Alert
            </Button>
          </form>
        )}
      </section>

      <FleetNodeFormModal node={editNode} open={showForm} onOpenChange={setShowForm} onSaved={loadNodes} />
    </div>
  );
}