import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";

const emptyForm = {
  node_name: "", service_type: "plex", public_ping_endpoint: "", internal_api_endpoint: "",
  admin_api_token: "", assigned_region: "", is_public_for_diagnostics: true,
  node_health_status: "operational", max_concurrent_limit: 4,
};

export default function FleetNodeFormModal({ node, open, onOpenChange, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (node) {
      setForm({ ...emptyForm, ...node, max_concurrent_limit: node.max_concurrent_limit || 4 });
    } else {
      setForm(emptyForm);
    }
  }, [node, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (node) {
        await base44.entities.AdminManagedNodes.update(node.id, form);
      } else {
        await base44.entities.AdminManagedNodes.create(form);
      }
      onSaved();
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
        <DialogHeader><DialogTitle>{node ? "Edit Fleet Node" : "Add Fleet Node"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Node Name</Label>
              <Input value={form.node_name} onChange={(e) => set("node_name", e.target.value)} required className="bg-slate-800 border-slate-700" placeholder="XC-Foxtrot" />
            </div>
            <div>
              <Label>Service Type</Label>
              <Select value={form.service_type} onValueChange={(v) => set("service_type", v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="plex">Plex</SelectItem>
                  <SelectItem value="emby">Emby</SelectItem>
                  <SelectItem value="jellyfin">Jellyfin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Internal API Endpoint</Label>
            <Input value={form.internal_api_endpoint} onChange={(e) => set("internal_api_endpoint", e.target.value)} className="bg-slate-800 border-slate-700" placeholder="https://plex.internal.example.com:32400" />
          </div>
          <div>
            <Label>Public Ping Endpoint</Label>
            <Input value={form.public_ping_endpoint} onChange={(e) => set("public_ping_endpoint", e.target.value)} className="bg-slate-800 border-slate-700" placeholder="https://plex.public.example.com" />
          </div>
          <div>
            <Label>Admin API Token</Label>
            <Input type="password" value={form.admin_api_token} onChange={(e) => set("admin_api_token", e.target.value)} className="bg-slate-800 border-slate-700" placeholder="Master server token" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Assigned Region</Label>
              <Input value={form.assigned_region} onChange={(e) => set("assigned_region", e.target.value)} className="bg-slate-800 border-slate-700" placeholder="US-East (Virginia)" />
            </div>
            <div>
              <Label>Max Concurrent Limit</Label>
              <Input type="number" value={form.max_concurrent_limit} onChange={(e) => set("max_concurrent_limit", Number(e.target.value))} className="bg-slate-800 border-slate-700" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Health Status</Label>
              <Select value={form.node_health_status} onValueChange={(v) => set("node_health_status", v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="degraded">Degraded</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Switch checked={form.is_public_for_diagnostics} onCheckedChange={(v) => set("is_public_for_diagnostics", v)} />
              <Label className="cursor-pointer">Public for Diagnostics</Label>
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {node ? "Save Changes" : "Add Node"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}