import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Bell, Webhook } from "lucide-react";

const NOTIFICATION_EVENTS = [
  { key: "notify_on_create", label: "New ticket created", desc: "Alert staff when a customer opens a ticket" },
  { key: "notify_on_reply", label: "New reply received", desc: "Alert staff when a customer or agent replies" },
  { key: "notify_on_status_change", label: "Status changed", desc: "Alert when a ticket is claimed, resolved, or closed" },
  { key: "notify_on_assign", label: "Ticket assigned", desc: "Alert when a ticket is assigned to an agent" },
];

export default function NotificationSection({ config, onChange }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-200">
        <Bell className="w-4 h-4 text-lime-400" />
        <h3 className="text-sm font-semibold">Notification Settings</h3>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
        <div>
          <p className="text-sm text-zinc-300">Enable Discord notifications</p>
          <p className="text-xs text-zinc-500">Master switch — when off, no webhooks fire</p>
        </div>
        <Switch checked={config.is_active} onCheckedChange={(v) => onChange({ ...config, is_active: v })} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400 flex items-center gap-1.5">
          <Webhook className="w-3 h-3" /> Main Webhook URL
        </label>
        <Input
          value={config.webhook_url || ""}
          onChange={(e) => onChange({ ...config, webhook_url: e.target.value })}
          placeholder="https://discord.com/api/webhooks/..."
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Staff Log Webhook URL (optional)</label>
        <Input
          value={config.log_webhook_url || ""}
          onChange={(e) => onChange({ ...config, log_webhook_url: e.target.value })}
          placeholder="https://discord.com/api/webhooks/..."
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
        />
        <p className="text-[11px] text-zinc-600">Internal staff notes route here instead of the main webhook.</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-zinc-400 mb-2">Event Triggers</p>
        {NOTIFICATION_EVENTS.map((evt) => (
          <div key={evt.key} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
            <div>
              <p className="text-sm text-zinc-300">{evt.label}</p>
              <p className="text-xs text-zinc-500">{evt.desc}</p>
            </div>
            <Switch
              checked={config[evt.key] !== false}
              onCheckedChange={(v) => onChange({ ...config, [evt.key]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}