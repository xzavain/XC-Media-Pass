import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { getApiForPlatform } from "@/lib/mediaServerApi";

export default function EditServerModal({ server, open, onOpenChange, onSaved }) {
  const [form, setForm] = useState({
    name: server?.name || "",
    url: server?.url || "",
    api_key: server?.api_key || "",
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Re-seed form when a different server is opened
  React.useEffect(() => {
    if (open) {
      setForm({ name: server?.name || "", url: server?.url || "", api_key: server?.api_key || "" });
      setTestResult(null);
      setTestError(null);
    }
  }, [open, server?.id]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    const url = form.url.replace(/\/$/, "");
    if (window.location.protocol === "https:" && url.startsWith("http://")) {
      setTestResult("error");
      setTestError("This app is served over HTTPS, so your browser blocks HTTP server addresses. Use an HTTPS URL.");
      setTesting(false);
      return;
    }
    try {
      const api = getApiForPlatform(server.platform);
      await api.testConnection(url, form.api_key);
      setTestResult("success");
    } catch (err) {
      setTestResult("error");
      setTestError(err.message || "Could not reach the server.");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = form.url.replace(/\/$/, "");
      await base44.entities.MediaServer.update(server.id, {
        name: form.name,
        url,
        api_key: form.api_key,
        last_synced: new Date().toISOString(),
      });
      toast({ title: "Server updated" });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Failed to update server", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canTest = form.url && form.api_key;
  const canSave = form.name && form.url && form.api_key;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Edit {server?.name}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Update the connection details for this {server?.platform} server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-zinc-300 text-sm">Server Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
          </div>
          <div>
            <Label className="text-zinc-300 text-sm">Server URL</Label>
            <Input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
          </div>
          <div>
            <Label className="text-zinc-300 text-sm">API Key / Token</Label>
            <Input
              type="password"
              value={form.api_key}
              onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Button variant="outline" onClick={handleTest} disabled={!canTest || testing} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</> : "Test Connection"}
            </Button>
            {testResult === "success" && <span className="flex items-center gap-1 text-emerald-400 text-sm"><CheckCircle2 className="w-4 h-4" /> Connected</span>}
            {testResult === "error" && <span className="flex items-center gap-1 text-rose-400 text-sm"><AlertCircle className="w-4 h-4" /> Failed</span>}
          </div>
          {testResult === "error" && testError && (
            <p className="text-xs text-rose-400/90 bg-rose-500/5 border border-rose-500/20 rounded-md px-3 py-2">{testError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave || saving} className="bg-violet-600 hover:bg-violet-700 text-white">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}