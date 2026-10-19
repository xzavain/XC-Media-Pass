import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function GatewayAccountModal({ account, open, onClose }) {
  const { toast } = useToast();
  const [provider, setProvider] = useState("stripe");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [keys, setKeys] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setProvider(account.provider || "stripe");
      setName(account.account_name || "");
      setIsActive(account.is_active !== false);
      setKeys(account.api_keys || {});
    } else {
      setProvider("stripe"); setName(""); setIsActive(true); setKeys({});
    }
  }, [account]);

  const handleSave = async () => {
    if (!name) { toast({ title: "Account name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const data = { provider, account_name: name, is_active: isActive, api_keys: keys };
      if (account) await base44.entities.PaymentGatewayAccount.update(account.id, data);
      else await base44.entities.PaymentGatewayAccount.create(data);
      toast({ title: "Gateway account saved" });
      onClose();
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-800 text-zinc-100 max-w-lg">
        <DialogHeader><DialogTitle>{account ? "Edit Gateway Account" : "Add Gateway Account"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-300 text-sm">Provider</Label>
              <Select value={provider} onValueChange={(v) => { setProvider(v); setKeys({}); }}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-300 text-sm">Account Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Stripe LLC" className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" />
            </div>
          </div>
          {provider === "stripe" ? (
            <div className="space-y-2">
              <div><Label className="text-zinc-300 text-sm">Publishable Key</Label><Input value={keys.publishable_key || ""} onChange={(e) => setKeys({ ...keys, publishable_key: e.target.value })} placeholder="pk_live_..." className="bg-slate-900 border-slate-700 text-zinc-100 mt-1 font-mono text-xs" /></div>
              <div><Label className="text-zinc-300 text-sm">Secret Key</Label><Input type="password" value={keys.secret_key || ""} onChange={(e) => setKeys({ ...keys, secret_key: e.target.value })} placeholder="sk_live_..." className="bg-slate-900 border-slate-700 text-zinc-100 mt-1 font-mono text-xs" /></div>
              <div><Label className="text-zinc-300 text-sm">Webhook Secret</Label><Input value={keys.webhook_secret || ""} onChange={(e) => setKeys({ ...keys, webhook_secret: e.target.value })} placeholder="whsec_..." className="bg-slate-900 border-slate-700 text-zinc-100 mt-1 font-mono text-xs" /></div>
            </div>
          ) : (
            <div className="space-y-2">
              <div><Label className="text-zinc-300 text-sm">Client ID</Label><Input value={keys.client_id || ""} onChange={(e) => setKeys({ ...keys, client_id: e.target.value })} className="bg-slate-900 border-slate-700 text-zinc-100 mt-1 font-mono text-xs" /></div>
              <div><Label className="text-zinc-300 text-sm">Client Secret</Label><Input type="password" value={keys.client_secret || ""} onChange={(e) => setKeys({ ...keys, client_secret: e.target.value })} className="bg-slate-900 border-slate-700 text-zinc-100 mt-1 font-mono text-xs" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-zinc-300 text-sm">Mode</Label>
                  <Select value={keys.mode || "live"} onValueChange={(v) => setKeys({ ...keys, mode: v })}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-zinc-100 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700"><SelectItem value="live">Live</SelectItem><SelectItem value="sandbox">Sandbox</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-zinc-300 text-sm">Webhook ID</Label><Input value={keys.webhook_id || ""} onChange={(e) => setKeys({ ...keys, webhook_id: e.target.value })} className="bg-slate-900 border-slate-700 text-zinc-100 mt-1 font-mono text-xs" /></div>
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <span className="text-sm text-zinc-300">Account active</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-zinc-300 hover:bg-slate-800">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white">{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}