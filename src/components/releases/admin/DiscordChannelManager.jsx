import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Send, Webhook } from "lucide-react";
import { sendDiscordWebhook } from "@/lib/watchlistSync";

const EVENT_LABELS = {
  theatrical_today: "Theatrical Premieres",
  vod_dropped: "Digital VOD Drops",
  imported_to_server: "Server Imports",
};

export default function DiscordChannelManager({ channels, onSaved }) {
  const [form, setForm] = useState({
    name: "", webhook_url: "", bot_name: "MediaEdge Announcer",
    bot_avatar_url: "", embed_color: "#6366f1", mention_type: "none", role_id: "",
    event_triggers: ["vod_dropped", "imported_to_server"],
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.AdminNotificationChannel.create({ ...form, platform: "discord_webhook", is_active: true });
      setForm({ ...form, name: "", webhook_url: "" });
      onSaved?.();
    } finally { setSaving(false); }
  };

  const handleTest = async (channel) => {
    setTesting(channel.id);
    try {
      await sendDiscordWebhook(channel.webhook_url, {
        title: "Test Notification",
        overview: "This is a test payload from MediaEdge Release Tracker.",
        poster_path: null, backdrop_path: null,
        digital_vod_release_date: "Test",
        theatrical_release_date: "Test",
        server_import_status: "imported_live",
      }, channel, "vod_dropped");
    } catch (err) {
      console.error("Test failed:", err);
    } finally { setTesting(null); }
  };

  const handleDelete = async (channel) => {
    await base44.entities.AdminNotificationChannel.delete(channel.id);
    onSaved?.();
  };

  const toggleTrigger = (trigger) => {
    setForm((f) => ({
      ...f,
      event_triggers: f.event_triggers.includes(trigger)
        ? f.event_triggers.filter((t) => t !== trigger)
        : [...f.event_triggers, trigger],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Existing channels */}
      <div className="space-y-2">
        {channels.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No notification channels configured.</p>
        ) : (
          channels.map((ch) => (
            <div key={ch.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-white font-medium">{ch.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${ch.is_active ? "text-emerald-400 bg-emerald-500/10" : "text-slate-500 bg-slate-800"}`}>
                    {ch.is_active ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="flex gap-1.5 mt-1">
                  {ch.event_triggers?.map((t) => (
                    <span key={t} className="text-[10px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">{EVENT_LABELS[t] || t}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button onClick={() => handleTest(ch)} disabled={testing === ch.id} variant="outline" className="border-slate-700 text-slate-300 text-xs h-7 gap-1">
                  {testing === ch.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Test
                </Button>
                <Button onClick={() => handleDelete(ch)} variant="ghost" className="text-rose-400 hover:bg-rose-500/10 h-7 px-2">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add new channel form */}
      <form onSubmit={handleSave} className="space-y-3 p-4 rounded-lg border border-slate-800 bg-slate-950/40">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-400" /> Add Discord Webhook Channel</h4>
        <Input required placeholder="Channel name (e.g. #vod-drops)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
        <Input required placeholder="Discord Webhook URL" value={form.webhook_url} onChange={(e) => setForm((f) => ({ ...f, webhook_url: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Bot name" value={form.bot_name} onChange={(e) => setForm((f) => ({ ...f, bot_name: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
          <Input placeholder="Bot avatar URL" value={form.bot_avatar_url} onChange={(e) => setForm((f) => ({ ...f, bot_avatar_url: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            Embed color:
            <input type="color" value={form.embed_color} onChange={(e) => setForm((f) => ({ ...f, embed_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer bg-transparent border border-slate-700" />
          </label>
          <Select value={form.mention_type} onValueChange={(v) => setForm((f) => ({ ...f, mention_type: v }))}>
            <SelectTrigger className="w-36 bg-slate-800 border-slate-700 text-slate-100 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="none">No mention</SelectItem>
              <SelectItem value="everyone">@everyone</SelectItem>
              <SelectItem value="here">@here</SelectItem>
              <SelectItem value="role">Custom Role</SelectItem>
            </SelectContent>
          </Select>
          {form.mention_type === "role" && (
            <Input placeholder="Role ID" value={form.role_id} onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))} className="flex-1 bg-slate-800 border-slate-700 text-slate-100 text-xs" />
          )}
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Event Triggers:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(EVENT_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded-lg">
                <Switch checked={form.event_triggers.includes(key)} onCheckedChange={() => toggleTrigger(key)} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Channel
        </Button>
      </form>
    </div>
  );
}