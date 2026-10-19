import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plug, CheckCircle2, AlertCircle } from "lucide-react";
import { createBookStackClient } from "@/lib/bookstackApi";

export default function MigrationConfigForm({ onConnected, onRunMigration, isRunning }) {
  const [baseUrl, setBaseUrl] = useState("https://wiki.xzavaincloud.com");
  const [tokenId, setTokenId] = useState("");
  const [tokenSecret, setTokenSecret] = useState("");
  const [corsProxy, setCorsProxy] = useState("https://proxy.cors.sh/");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTest = async () => {
    if (!baseUrl || !tokenId || !tokenSecret) return;
    setTesting(true);
    setTestResult(null);
    try {
      const client = createBookStackClient(baseUrl, tokenId, tokenSecret, corsProxy);
      const result = await client.testConnection();
      setTestResult(result);
      if (result.ok) onConnected({ baseUrl, tokenId, tokenSecret, corsProxy, total: result.total });
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-1">BookStack Connection</h3>
        <p className="text-xs text-zinc-500">
          Configure your BookStack instance API credentials. The migration only reads from this instance — it never modifies your external BookStack data.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-zinc-400">BookStack Base URL</Label>
          <Input
            placeholder="https://wiki.example.com"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-zinc-400">API Token ID</Label>
            <Input
              placeholder="Token ID"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">API Token Secret</Label>
            <Input
              type="password"
              placeholder="Token Secret"
              value={tokenSecret}
              onChange={(e) => setTokenSecret(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-zinc-400">CORS Proxy URL (optional)</Label>
          <Input
            placeholder="https://proxy.cors.sh/"
            value={corsProxy}
            onChange={(e) => setCorsProxy(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
          />
          <p className="text-[11px] text-zinc-600 mt-1">
            Browsers block direct cross-origin API calls. A CORS proxy routes requests to avoid this. The default (proxy.cors.sh) forwards Authorization headers. Clear this field only if your BookStack instance sends permissive CORS headers.
          </p>
        </div>
      </div>

      {testResult && (
        <div className={`flex items-center gap-2 text-xs ${testResult.ok ? "text-lime-400" : "text-red-400"}`}>
          {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {testResult.ok ? `Connected — ${testResult.total} books found` : testResult.error || "Connection failed"}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="border-zinc-700 gap-1.5" onClick={handleTest} disabled={testing || !baseUrl || !tokenId || !tokenSecret}>
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
          Test Connection
        </Button>
        <Button
          className="bg-lime-600 hover:bg-lime-700 text-white gap-1.5"
          disabled={!testResult?.ok || isRunning}
          onClick={() => onRunMigration({ baseUrl, tokenId, tokenSecret, corsProxy })}
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isRunning ? "Running Migration..." : "Start Full Migration"}
        </Button>
      </div>
    </div>
  );
}