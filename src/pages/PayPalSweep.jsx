import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeftRight, Loader2, Play, PlugZap, Save, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

async function sweepApi(method, path, body) {
  const token = (() => { try { return localStorage.getItem("xcmp_token"); } catch { return null; } })();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(`/api/paypal-sweep${path}`, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const STATUS_STYLES = {
  sent: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  skipped: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  failed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function PayPalSweep() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirmRun, setConfirmRun] = useState(false);
  const [gatewayAccounts, setGatewayAccounts] = useState([]);
  const [runs, setRuns] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [form, setForm] = useState({
    source_account_id: "", client_id: "", client_secret: "", mode: "live",
    destination: "", reserve: 25, threshold: 1, run_time: "23:30", enabled: false,
    has_client_secret: false,
  });

  const load = useCallback(async () => {
    try {
      const [{ config }, { runs: runList }, accounts] = await Promise.all([
        sweepApi("GET", "/config"),
        sweepApi("GET", "/runs?limit=50"),
        base44.entities.PaymentGatewayAccount.list("-created_date").catch(() => []),
      ]);
      setForm({ ...config, client_secret: "" });
      setRuns(runList || []);
      setGatewayAccounts((accounts || []).filter((a) => a.provider === "paypal"));
    } catch (err) {
      toast({ title: "Could not load sweep settings", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const usingGateway = Boolean(form.source_account_id);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { config } = await sweepApi("PUT", "/config", {
        source_account_id: form.source_account_id || null,
        client_id: form.client_id,
        client_secret: form.client_secret || undefined,
        mode: form.mode,
        destination: form.destination,
        reserve: Number(form.reserve),
        threshold: Number(form.threshold),
        run_time: form.run_time,
        enabled: form.enabled,
      });
      setForm({ ...config, client_secret: "" });
      toast({ title: "Sweep settings saved" });
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await sweepApi("POST", "/test");
      setTestResult(result);
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
    } finally { setTesting(false); }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const { run } = await sweepApi("POST", "/run");
      setRuns((prev) => [run, ...prev]);
      if (run.status === "sent") toast({ title: "Sweep sent", description: `${run.swept?.toFixed(2)} ${run.currency || ""} sent to ${run.destination}` });
      else if (run.status === "skipped") toast({ title: "Sweep skipped", description: run.detail || "Nothing to sweep." });
      else toast({ title: "Sweep failed", description: run.error || "See run history for details.", variant: "destructive" });
    } catch (err) {
      toast({ title: "Run failed", description: err.message, variant: "destructive" });
    } finally { setRunning(false); setConfirmRun(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2"><ArrowLeftRight className="w-6 h-6 text-cyan-400" /> PayPal Sweep</h1>
          <p className="text-sm text-slate-500 mt-1">Once a day, send the available PayPal balance (minus a reserve) to another PayPal account via the Payouts API.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{form.enabled ? "Daily sweep on" : "Daily sweep off"}</span>
          <Switch checked={!!form.enabled} onCheckedChange={(v) => set("enabled", v)} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-200">Configuration</h2>
        <div>
          <Label className="text-zinc-300 text-sm">Source PayPal account</Label>
          <Select value={form.source_account_id || "__dedicated__"} onValueChange={(v) => set("source_account_id", v === "__dedicated__" ? "" : v)}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 mt-1"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="__dedicated__">Dedicated credentials (enter below)</SelectItem>
              {gatewayAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.account_name || "PayPal account"} (saved gateway account)</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">Reuse a PayPal account from Payment Gateways, or enter dedicated app credentials. Payouts must be enabled on the source account by PayPal.</p>
        </div>

        {!usingGateway && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-300 text-sm">Client ID</Label>
              <Input value={form.client_id} onChange={(e) => set("client_id", e.target.value)} placeholder="PayPal app client ID" className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" autoComplete="off" />
            </div>
            <div>
              <Label className="text-zinc-300 text-sm">Client Secret</Label>
              <Input type="password" value={form.client_secret} onChange={(e) => set("client_secret", e.target.value)} placeholder={form.has_client_secret ? "•••••••••••• (saved — leave blank to keep)" : "PayPal app secret"} className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" autoComplete="new-password" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-zinc-300 text-sm">Destination (PayPal email or payer ID)</Label>
            <Input value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="you@example.com" className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" autoComplete="off" />
          </div>
          {!usingGateway && (
            <div>
              <Label className="text-zinc-300 text-sm">Mode</Label>
              <Select value={form.mode} onValueChange={(v) => set("mode", v)}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-zinc-300 text-sm">Reserve buffer (USD)</Label>
            <Input type="number" min="0" step="0.01" value={form.reserve} onChange={(e) => set("reserve", e.target.value)} className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" />
            <p className="text-xs text-slate-500 mt-1">Always leave this much behind.</p>
          </div>
          <div>
            <Label className="text-zinc-300 text-sm">Minimum sweep (USD)</Label>
            <Input type="number" min="0" step="0.01" value={form.threshold} onChange={(e) => set("threshold", e.target.value)} className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" />
            <p className="text-xs text-slate-500 mt-1">Skip the day if less than this would move.</p>
          </div>
          <div>
            <Label className="text-zinc-300 text-sm">Daily run time</Label>
            <Input type="time" value={form.run_time} onChange={(e) => set("run_time", e.target.value)} className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" />
            <p className="text-xs text-slate-500 mt-1">America/Chicago time.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white min-h-[44px]">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save settings
          </Button>
          <Button onClick={handleTest} disabled={testing} variant="outline" className="border-slate-700 text-zinc-300 hover:bg-slate-800 min-h-[44px]">
            {testing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlugZap className="w-4 h-4 mr-1" />} Test connection
          </Button>
        </div>

        {testResult && (
          <div className={`rounded-lg border p-3 text-xs space-y-1.5 ${testResult.ok ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200" : "border-rose-500/30 bg-rose-500/5 text-rose-200"}`}>
            {testResult.ok ? (
              <>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Credentials accepted ({testResult.mode} mode, via {testResult.source}).</p>
                <p>Balance readable — available: {typeof testResult.available === "number" ? testResult.available.toFixed(2) : "?"} {testResult.currency || ""}</p>
                <p className="flex items-center gap-1.5">
                  {testResult.payouts_scope
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Payouts scope present on the granted token.</>
                    : <><AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> <span className="text-amber-200">Payouts scope not listed on the granted token — payouts may be refused until Payouts is enabled on the source account.</span></>}
                </p>
                {testResult.scopes?.length > 0 && <p className="text-slate-400 break-words">Scopes: {testResult.scopes.join(" ")}</p>}
                {testResult.warning && <p className="text-amber-200">{testResult.warning}</p>}
              </>
            ) : (
              <p className="flex items-start gap-1.5"><XCircle className="w-3.5 h-3.5 mt-px shrink-0" /> <span className="break-words">{testResult.error || "Connection test failed."}</span></p>
            )}
            <p className="text-slate-500">The test never sends a payout.</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-200">Run now</h2>
        <p className="text-xs text-slate-500">Runs the same sweep the daily job performs: reads the live available balance and sends everything above the reserve, once per day at most. A repeat run on the same day never sends twice.</p>
        {!confirmRun ? (
          <Button onClick={() => setConfirmRun(true)} variant="outline" className="border-slate-700 text-zinc-300 hover:bg-slate-800 min-h-[44px]"><Play className="w-4 h-4 mr-1" /> Run sweep now</Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-amber-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> This sends real money if the balance is above the reserve. Continue?</span>
            <Button onClick={handleRun} disabled={running} className="bg-cyan-600 hover:bg-cyan-700 text-white min-h-[44px]">
              {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />} Confirm sweep
            </Button>
            <Button onClick={() => setConfirmRun(false)} variant="ghost" className="text-slate-400 hover:text-white min-h-[44px]">Cancel</Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Sweep history</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">No sweep runs yet.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded border capitalize ${STATUS_STYLES[r.status] || STATUS_STYLES.skipped}`}>{r.status}</span>
                  <span className="text-xs text-slate-400 capitalize">{r.trigger}</span>
                  <span className="text-xs text-slate-500">{new Date(r.started_at).toLocaleString()}</span>
                  {r.batch_id && <span className="text-[11px] text-slate-500 font-mono break-all">{r.batch_id}</span>}
                  <span className="text-xs text-zinc-300 ml-auto">
                    {typeof r.available === "number" ? `Available ${r.available.toFixed(2)}` : ""}
                    {typeof r.swept === "number" && r.swept > 0 ? ` → Swept ${r.swept.toFixed(2)} ${r.currency || ""}` : ""}
                  </span>
                </div>
                {r.destination && <p className="text-xs text-slate-500 break-all">To: {r.destination}{r.payout_batch_id ? ` · Payout batch ${r.payout_batch_id}` : ""}</p>}
                {r.error && <p className="text-xs text-rose-300 break-words">{r.error}</p>}
                {r.detail && <p className="text-xs text-slate-500 break-words">{r.detail}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
