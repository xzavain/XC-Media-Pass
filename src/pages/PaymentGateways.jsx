import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { CreditCard, Plus, Pencil, Trash2, RefreshCw, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import GatewayAccountModal from "@/components/billing/GatewayAccountModal";

export default function PaymentGateways() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState(null);

  const load = useCallback(async () => {
    const [accs, lg] = await Promise.all([
      base44.entities.PaymentGatewayAccount.list("-created_date"),
      base44.entities.SyncLog.list("-created_date", 10),
    ]);
    setAccounts(accs); setLogs(lg); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => { await base44.entities.PaymentGatewayAccount.delete(id); setAccounts((p) => p.filter((a) => a.id !== id)); toast({ title: "Account removed" }); };
  const handleToggle = async (a, v) => { await base44.entities.PaymentGatewayAccount.update(a.id, { is_active: v }); setAccounts((p) => p.map((x) => (x.id === a.id ? { ...x, is_active: v } : x))); };
  const handleSync = () => {
    toast({ title: "Live sync requires Builder+", description: "Use Import on the Subscriptions page to add data manually for now." });
  };
  const webhookUrl = (a) => `${window.location.origin}/functions/${a.provider}Webhook?accountId=${a.id}`;

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2"><CreditCard className="w-6 h-6 text-cyan-400" /> Payment Gateways</h1><p className="text-sm text-slate-500 mt-1">Manage connected Stripe & PayPal accounts</p></div>
        <Button onClick={() => { setEditAccount(null); setShowModal(true); }} className="bg-cyan-600 hover:bg-cyan-700 text-white"><Plus className="w-4 h-4 mr-1" /> Add Account</Button>
      </div>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">Live API sync, webhook endpoints, and the automated 60-minute cron require the Builder+ plan. Add accounts and import subscriptions manually now; live ingestion activates on upgrade.</div>
      {accounts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl"><CreditCard className="w-10 h-10 text-slate-700 mx-auto mb-3" /><p className="text-sm text-slate-500">No gateway accounts yet. Add a Stripe or PayPal account to begin.</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2"><span className="text-sm font-semibold text-zinc-100">{a.account_name}</span><span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">{a.provider}</span></div>
                  <p className="text-xs text-slate-500 mt-0.5">Sync: {a.sync_status || "idle"} · {a.last_synced_at ? new Date(a.last_synced_at).toLocaleString() : "never"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => { setEditAccount(a); setShowModal(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => handleDelete(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={handleSync} className="border-slate-700 text-zinc-300 hover:bg-slate-800"><RefreshCw className="w-3.5 h-3.5 mr-1" /> Sync Now</Button>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(webhookUrl(a)); toast({ title: "Webhook URL copied" }); }} className="text-slate-400 hover:text-white"><Copy className="w-3.5 h-3.5 mr-1" /> Webhook URL</Button>
                <div className="ml-auto flex items-center gap-2"><span className="text-xs text-slate-500">{a.is_active ? "Active" : "Disabled"}</span><Switch checked={!!a.is_active} onCheckedChange={(v) => handleToggle(a, v)} /></div>
              </div>
              {a.error_message && <p className="text-xs text-rose-400">{a.error_message}</p>}
            </div>
          ))}
        </div>
      )}
      {logs.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-200 mb-3">Recent Sync Activity</h2>
          <div className="space-y-1.5">{logs.map((l) => <div key={l.id} className="flex items-center justify-between text-xs"><span className="text-slate-400 capitalize">{l.status} · {l.trigger}</span><span className="text-slate-500">{l.records_pulled} pulled · {l.records_updated} updated</span></div>)}</div>
        </div>
      )}
      {showModal && <GatewayAccountModal account={editAccount} open={showModal} onClose={() => { setShowModal(false); load(); }} />}
    </div>
  );
}