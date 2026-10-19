import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import BotIdentitySection from "@/components/discord/BotIdentitySection";
import PanelBuilderSection from "@/components/discord/PanelBuilderSection";
import NotificationSection from "@/components/discord/NotificationSection";
import CannedReplyManager from "@/components/tickets/CannedReplyManager";

const TABS = [
  { key: "bot", label: "Bot Identity" },
  { key: "panel", label: "Panel Builder" },
  { key: "notifications", label: "Notifications" },
  { key: "canned", label: "Canned Replies" },
];

const DEFAULT_CONFIG = {
  bot_name: "Support Bot",
  status_type: "playing",
  panel_embed_title: "Support Tickets",
  panel_embed_description: "Click the button below to create a support ticket.",
  panel_embed_color: "#a3e635",
  panel_button_label: "Create Ticket",
  panel_button_emoji: "🎫",
  auto_create_channels: true,
  notify_on_create: true,
  notify_on_reply: true,
  notify_on_status_change: true,
  notify_on_assign: true,
  is_active: false,
};

export default function DiscordSettings() {
  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("bot");

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.DiscordBotConfig.list();
      if (list[0]) {
        setConfig({ ...DEFAULT_CONFIG, ...list[0] });
        setConfigId(list[0].id);
      } else {
        setConfig({ ...DEFAULT_CONFIG });
        setConfigId(null);
      }
    } catch {
      setConfig({ ...DEFAULT_CONFIG });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      if (configId) {
        await base44.entities.DiscordBotConfig.update(configId, config);
      } else {
        const created = await base44.entities.DiscordBotConfig.create(config);
        setConfigId(created.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-lime-500" />
      </div>
    );
  }

  const isCannedTab = tab === "canned";

  return (
    <div className="p-6 lg:p-8 w-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100">Discord Integration</h1>
          <p className="text-sm text-zinc-500 mt-1">Configure your support bot, ticket panels, and notification webhooks</p>
        </div>
        {!isCannedTab && (
          <Button onClick={handleSave} disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "text-lime-400 border-lime-500"
                : "text-zinc-400 border-transparent hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isCannedTab ? (
        <CannedReplyManager />
      ) : (
        <div className="max-w-2xl space-y-6">
          {tab === "bot" && <BotIdentitySection config={config} onChange={setConfig} />}
          {tab === "panel" && <PanelBuilderSection config={config} onChange={setConfig} />}
          {tab === "notifications" && <NotificationSection config={config} onChange={setConfig} />}

          {!config.webhook_url && config.is_active && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Notifications are enabled but no webhook URL is set. Add a webhook URL in the Notifications tab to start receiving alerts.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <p className="text-xs text-zinc-500">
              <strong className="text-zinc-400">Note:</strong> Outbound webhook notifications (ticket created, reply, status change) work immediately from the web app.
              Full bidirectional bot features — listening to Discord messages, auto-creating channels, and reaction-panel ticket creation — require a persistent bot process (Builder+ backend function).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}