import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Server, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { getApiForPlatform } from "@/lib/mediaServerApi";

export default function AddServerModal({ open, onOpenChange, onAdded }) {
  const [form, setForm] = useState({ name: "", platform: "", url: "", api_key: "" });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);

    const url = form.url.replace(/\/$/, "");

    // Mixed-content check: browsers silently block http:// requests from an https:// page.
    if (window.location.protocol === "https:" && url.startsWith("http://")) {
      setTestResult("error");
      setTestError("This app is served over HTTPS, so your browser blocks requests to an HTTP server address. Use an HTTPS URL for your server (e.g. a plex.direct address, a reverse proxy, or your Jellyfin/Emby HTTPS port).");
      setTesting(false);
      return;
    }

    try {
      const api = getApiForPlatform(form.platform);
      await api.testConnection(url, form.api_key);
      setTestResult("success");
    } catch (err) {
      setTestResult("error");
      setTestError(err.message || "Could not reach the server. Check the URL, token, and that the server is reachable from the internet.");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const api = getApiForPlatform(form.platform);
      const url = form.url.replace(/\/$/, "");

      if (window.location.protocol === "https:" && url.startsWith("http://")) {
        throw new Error("This app runs on HTTPS, so your browser blocks requests to an HTTP server address. Use an HTTPS URL for your server.");
      }

      // Verify the server is actually reachable before saving it as connected.
      await api.testConnection(url, form.api_key);

      let libraries = [];
      try {
        libraries = await api.getLibraries(url, form.api_key);
      } catch {
        // Libraries fetch failed, save without
      }

      await base44.entities.MediaServer.create({
        name: form.name,
        platform: form.platform,
        url,
        api_key: form.api_key,
        status: "connected",
        libraries,
        last_synced: new Date().toISOString(),
      });

      await base44.entities.ActivityLog.create({
        action: "server_connected",
        details: `${form.name} (${form.platform}) connected`,
        platform: form.platform,
      });

      toast({ title: "Server added", description: `${form.name} connected successfully` });
      onAdded?.();
      onOpenChange(false);
      setForm({ name: "", platform: "", url: "", api_key: "" });
      setTestResult(null);
      setTestError(null);
    } catch (err) {
      toast({ title: "Failed to add server", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canTest = form.platform && form.url && form.api_key;
  const canSave = canTest && form.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Server className="w-5 h-5 text-violet-400" />
            Add Media Server
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Connect a Plex, Jellyfin, or Emby server to manage user invitations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-zinc-300 text-sm">Server Name</Label>
            <Input
              placeholder="My Media Server"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
          </div>

          <div>
            <Label className="text-zinc-300 text-sm">Platform</Label>
            <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="plex">Plex</SelectItem>
                <SelectItem value="jellyfin">Jellyfin</SelectItem>
                <SelectItem value="emby">Emby</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-zinc-300 text-sm">Server URL</Label>
            <Input
              placeholder="http://192.168.1.100:8096"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
            <p className="text-xs text-zinc-500 mt-1">Include protocol and port</p>
          </div>

          <div>
            <Label className="text-zinc-300 text-sm">
              {form.platform === "plex" ? "Plex Token" : "API Key"}
            </Label>
            <Input
              type="password"
              placeholder={form.platform === "plex" ? "Your Plex token" : "Admin API key"}
              value={form.api_key}
              onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!canTest || testing}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              {testing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
              ) : (
                "Test Connection"
              )}
            </Button>
            {testResult === "success" && (
              <span className="flex items-center gap-1 text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Connected
              </span>
            )}
            {testResult === "error" && (
              <span className="flex items-center gap-1 text-rose-400 text-sm">
                <AlertCircle className="w-4 h-4" /> Failed
              </span>
            )}
          </div>

          {testResult === "error" && testError && (
            <p className="text-xs text-rose-400/90 bg-rose-500/5 border border-rose-500/20 rounded-md px-3 py-2">
              {testError}
            </p>
          )}

          <Button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            {saving ? "Saving..." : "Add Server"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}