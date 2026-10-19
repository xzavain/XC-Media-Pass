import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot } from "lucide-react";

export default function BotIdentitySection({ config, onChange }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-200">
        <Bot className="w-4 h-4 text-lime-400" />
        <h3 className="text-sm font-semibold">Bot Identity</h3>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
          {config.avatar_url ? (
            <img src={config.avatar_url} alt="Bot avatar" className="w-full h-full object-cover" />
          ) : (
            <Bot className="w-7 h-7 text-zinc-600" />
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-xs text-zinc-400">Avatar URL</label>
          <Input
            value={config.avatar_url || ""}
            onChange={(e) => onChange({ ...config, avatar_url: e.target.value })}
            placeholder="https://cdn.discordapp.com/..."
            className="bg-zinc-800 border-zinc-700 text-zinc-100"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Bot Name</label>
        <Input
          value={config.bot_name || ""}
          onChange={(e) => onChange({ ...config, bot_name: e.target.value })}
          placeholder="Support Bot"
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Status Type</label>
          <Select value={config.status_type || "playing"} onValueChange={(v) => onChange({ ...config, status_type: v })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="playing">Playing</SelectItem>
              <SelectItem value="listening">Listening to</SelectItem>
              <SelectItem value="watching">Watching</SelectItem>
              <SelectItem value="competing">Competing in</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Status Activity</label>
          <Input
            value={config.status_activity || ""}
            onChange={(e) => onChange({ ...config, status_activity: e.target.value })}
            placeholder="e.g. your tickets 🎫"
            className="bg-zinc-800 border-zinc-700 text-zinc-100"
          />
        </div>
      </div>
    </div>
  );
}