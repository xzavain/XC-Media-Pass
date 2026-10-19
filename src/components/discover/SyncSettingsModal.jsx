import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function SyncSettingsModal({ open, onOpenChange, preferences, onSave }) {
  const [local, setLocal] = useState({});

  useEffect(() => {
    setLocal(preferences || { plex_enabled: false, emby_enabled: false, sync_mode: "push_only" });
  }, [preferences, open]);

  const handleSave = () => {
    onSave(local);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Watchlist Sync Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Plex */}
          <div className="space-y-3 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-200">Sync with Plex Watchlist</Label>
              <Switch
                checked={local.plex_enabled}
                onCheckedChange={(v) => setLocal((p) => ({ ...p, plex_enabled: v }))}
              />
            </div>
            {local.plex_enabled && (
              <Input
                placeholder="Plex token or user claim token"
                value={local.plex_token || ""}
                onChange={(e) => setLocal((p) => ({ ...p, plex_token: e.target.value }))}
                className="bg-zinc-900 border-zinc-700 text-zinc-200"
              />
            )}
          </div>

          {/* Emby */}
          <div className="space-y-3 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-200">Sync with Emby Favorites</Label>
              <Switch
                checked={local.emby_enabled}
                onCheckedChange={(v) => setLocal((p) => ({ ...p, emby_enabled: v }))}
              />
            </div>
            {local.emby_enabled && (
              <div className="space-y-2">
                <Input
                  placeholder="Emby server host (e.g. http://192.168.1.10:8096)"
                  value={local.emby_host || ""}
                  onChange={(e) => setLocal((p) => ({ ...p, emby_host: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-zinc-200"
                />
                <Input
                  placeholder="Emby username"
                  value={local.emby_user || ""}
                  onChange={(e) => setLocal((p) => ({ ...p, emby_user: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-zinc-200"
                />
                <Input
                  placeholder="Emby API key"
                  value={local.emby_token || ""}
                  onChange={(e) => setLocal((p) => ({ ...p, emby_token: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-zinc-200"
                />
              </div>
            )}
          </div>

          {/* Sync mode */}
          {(local.plex_enabled || local.emby_enabled) && (
            <div className="space-y-2">
              <Label className="text-zinc-200">Sync Mode</Label>
              <select
                value={local.sync_mode || "push_only"}
                onChange={(e) => setLocal((p) => ({ ...p, sync_mode: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2"
              >
                <option value="bidirectional">Bidirectional (2-way sync)</option>
                <option value="push_only">Push Only (portal → servers)</option>
              </select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-300">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-lime-600 hover:bg-lime-700 text-white">
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}