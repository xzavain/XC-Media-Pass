import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LayoutPanelTop } from "lucide-react";

export default function PanelBuilderSection({ config, onChange }) {
  const color = config.panel_embed_color || "#a3e635";
  const previewStyle = { borderLeft: `4px solid ${color}` };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-200">
        <LayoutPanelTop className="w-4 h-4 text-lime-400" />
        <h3 className="text-sm font-semibold">Ticket Panel Builder</h3>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-300">Auto-create private channels</p>
          <p className="text-xs text-zinc-500">Open a dedicated Discord channel for each new ticket</p>
        </div>
        <Switch checked={config.auto_create_channels} onCheckedChange={(v) => onChange({ ...config, auto_create_channels: v })} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Panel Channel ID</label>
        <Input
          value={config.panel_channel_id || ""}
          onChange={(e) => onChange({ ...config, panel_channel_id: e.target.value })}
          placeholder="Discord channel ID for the panel message"
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Embed Title</label>
        <Input
          value={config.panel_embed_title || ""}
          onChange={(e) => onChange({ ...config, panel_embed_title: e.target.value })}
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Embed Description</label>
        <Textarea
          value={config.panel_embed_description || ""}
          onChange={(e) => onChange({ ...config, panel_embed_description: e.target.value })}
          rows={3}
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Embed Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => onChange({ ...config, panel_embed_color: e.target.value })}
              className="w-8 h-8 rounded border border-zinc-700 bg-zinc-800 cursor-pointer"
            />
            <Input
              value={color}
              onChange={(e) => onChange({ ...config, panel_embed_color: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Button Emoji</label>
          <Input
            value={config.panel_button_emoji || ""}
            onChange={(e) => onChange({ ...config, panel_button_emoji: e.target.value })}
            placeholder="🎫"
            className="bg-zinc-800 border-zinc-700 text-zinc-100"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Button Label</label>
          <Input
            value={config.panel_button_label || ""}
            onChange={(e) => onChange({ ...config, panel_button_label: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-zinc-100"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Support Role ID (pinged on new tickets)</label>
        <Input
          value={config.support_role_id || ""}
          onChange={(e) => onChange({ ...config, support_role_id: e.target.value })}
          placeholder="Discord role ID"
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
        />
      </div>

      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-3">
        <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-2">Live Preview</p>
        <div className="rounded border-l-4 bg-zinc-800/50 p-3" style={previewStyle}>
          <p className="text-sm font-semibold text-zinc-100">{config.panel_embed_title || "Support Tickets"}</p>
          <p className="text-xs text-zinc-400 mt-1">{config.panel_embed_description || "Click the button below to create a support ticket."}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-lime-600/20 text-lime-400 border border-lime-600/30">
            {config.panel_button_emoji || "🎫"} {config.panel_button_label || "Create Ticket"}
          </div>
        </div>
      </div>
    </div>
  );
}