import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Megaphone, X } from "lucide-react";

const severityConfig = {
  info: { label: "Info", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  warning: { label: "Degraded", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  critical: { label: "Major Outage", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  maintenance: { label: "Scheduled Maintenance", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
};

export default function AlertManager({ servers, alerts, onAlertsChanged }) {
  const [form, setForm] = useState({
    is_all_servers: false, server_id: "", severity: "info", title: "", message: "",
    is_active: true, start_time: "", end_time: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) return;
    setSaving(true);
    try {
      await base44.entities.ServerAlert.create({
        ...form,
        server_id: form.is_all_servers ? "" : form.server_id,
        start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      });
      setForm({ is_all_servers: false, server_id: "", severity: "info", title: "", message: "", is_active: true, start_time: "", end_time: "" });
      onAlertsChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (alert) => {
    await base44.entities.ServerAlert.update(alert.id, { is_active: false });
    onAlertsChanged?.();
  };

  const activeAlerts = alerts.filter((a) => a.is_active);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-lime-400" /> Broadcast Alert
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Target</label>
            <Select
              value={form.is_all_servers ? "all" : form.server_id}
              onValueChange={(v) => setForm((f) => ({ ...f, is_all_servers: v === "all", server_id: v === "all" ? "" : v }))}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all">All Servers</SelectItem>
                {servers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Severity</label>
            <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {Object.entries(severityConfig).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Alert title" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
        <Textarea required value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Alert message (supports basic HTML)" rows={3} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
          <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
            Publish Live Alert Immediately
          </label>
          <Button type="submit" disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white">
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Publish
          </Button>
        </div>
      </form>

      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Active Alerts</p>
          {activeAlerts.map((a) => {
            const cfg = severityConfig[a.severity] || severityConfig.info;
            return (
              <div key={a.id} className={`flex items-start justify-between gap-3 rounded-lg border ${cfg.bg} ${cfg.border} px-3 py-2`}>
                <div>
                  <p className={`text-sm font-semibold ${cfg.color}`}>{a.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{a.is_all_servers ? "All Servers" : servers.find((s) => s.id === a.server_id)?.name || "Unknown"}</p>
                </div>
                <button onClick={() => handleDeactivate(a)} className="text-zinc-500 hover:text-rose-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}