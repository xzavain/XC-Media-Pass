import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getApiForPlatform, PlexAPI } from "@/lib/mediaServerApi";
import { useToast } from "@/components/ui/use-toast";

export default function EditServerUserModal({ serverUser, server, open, onOpenChange, onSaved }) {
  const [friendlyName, setFriendlyName] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    if (serverUser) {
      setFriendlyName(serverUser.friendly_name || serverUser.username || "");
      setSelectedIds(new Set((serverUser.libraries || []).map((l) => l.id)));
    }
  }, [serverUser]);

  useEffect(() => {
    if (open) base44.entities.StorePlan.list().then(setPlans);
  }, [open]);

  const applyPlan = (planId) => {
    const plan = plans.find((p) => p.id === planId);
    const mapping = plan?.library_map?.find((m) => m.server_id === server.id);
    setSelectedIds(new Set(mapping?.library_ids || []));
  };

  const toggleLibrary = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const libraryIds = Array.from(selectedIds);

      if (server.platform === "plex") {
        await PlexAPI.updateSharedLibraries(server.api_key, serverUser.platform_user_id, libraryIds);
      } else {
        const api = getApiForPlatform(server.platform);
        // Emby/Jellyfin's EnabledFolders expects library GUIDs (not the numeric
        // ItemId used for API calls), so map the selected libraries to their GUIDs.
        const guids = (server.libraries || [])
          .filter((l) => selectedIds.has(l.id))
          .map((l) => l.guid || l.id);
        await api.setUserPolicy(server.url, server.api_key, serverUser.platform_user_id, guids);
      }

      const libraries = (server.libraries || []).filter((l) => selectedIds.has(l.id));
      await base44.entities.ServerUser.update(serverUser.id, {
        friendly_name: friendlyName,
        libraries,
      });

      toast({ title: "User updated" });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Failed to update user", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!serverUser || !server) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div>
            <Label className="text-zinc-300 text-sm">Display Name</Label>
            <Input
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              placeholder={serverUser.username}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
            <p className="text-xs text-zinc-500 mt-1">Original: {serverUser.username}</p>
          </div>

          {plans.length > 0 && (
            <div>
              <Label className="text-zinc-300 text-sm">Apply Plan Libraries</Label>
              <Select onValueChange={applyPlan}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1">
                  <SelectValue placeholder="Choose a plan to apply..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500 mt-1">Sets library access below from the plan's mapping — remember to save.</p>
            </div>
          )}

          <div>
            <Label className="text-zinc-300 text-sm">Library Access</Label>
            <div className="mt-2 space-y-2 max-h-56 overflow-y-auto border border-zinc-800 rounded-md p-2">
              {(server.libraries || []).length === 0 && (
                <p className="text-xs text-zinc-500 px-1 py-2">No libraries synced for this server yet.</p>
              )}
              {(server.libraries || []).map((lib) => (
                <label key={lib.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-zinc-800/50 cursor-pointer">
                  <Checkbox checked={selectedIds.has(lib.id)} onCheckedChange={() => toggleLibrary(lib.id)} />
                  <span className="text-sm text-zinc-300">{lib.name}</span>
                </label>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}