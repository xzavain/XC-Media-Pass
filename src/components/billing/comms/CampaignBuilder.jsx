import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { resolveRecipients, dispatchCampaign } from "@/lib/campaignDispatcher";

const AUDIENCES = [
  { value: "all", label: "All Customers" },
  { value: "active", label: "Active Subscriptions" },
  { value: "inactive", label: "Inactive / Canceled" },
  { value: "migrated", label: "Migrated (from Stripe/PayPal)" },
  { value: "not_welcomed", label: "Not Yet Welcomed (deferred onboarding)" },
  { value: "custom", label: "Custom Email List" },
];

export default function CampaignBuilder({ templates, customers, plans, discordConfig, open, onOpenChange, onDispatched }) {
  const [form, setForm] = useState({
    name: "",
    template_id: "",
    channel: "email",
    target_audience: "all",
    target_emails: "",
    scheduled_at: "",
  });
  const [dispatching, setDispatching] = useState(false);
  const [result, setResult] = useState(null);
  const { user } = useAuth();

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const selectedTemplate = templates.find((t) => t.id === form.template_id);
  const recipientCount = resolveRecipients({ ...form, target_emails: form.target_emails ? form.target_emails.split(",").map((e) => e.trim()) : [] }, customers).length;

  const handleCreate = async (dispatchNow) => {
    setDispatching(true);
    setResult(null);
    try {
      const campaign = await base44.entities.CommunicationCampaign.create({
        name: form.name,
        template_id: form.template_id,
        channel: form.channel,
        target_audience: form.target_audience,
        target_emails: form.target_audience === "custom" ? form.target_emails.split(",").map((e) => e.trim()).filter(Boolean) : [],
        status: dispatchNow ? "sending" : "draft",
        scheduled_at: form.scheduled_at || null,
        created_by_name: user?.full_name || "",
        created_by_email: user?.email || "",
      });

      if (dispatchNow && selectedTemplate) {
        const res = await dispatchCampaign(campaign, selectedTemplate, customers, plans, discordConfig);
        setResult(res);
      }

      onDispatched?.();
      if (!dispatchNow) onOpenChange(false);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setDispatching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle>New Communication Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-zinc-400">Campaign Name</Label>
            <Input value={form.name} onChange={(e) => set("name")(e.target.value)} className="bg-zinc-950/50 border-zinc-700" placeholder="e.g. Welcome Email Batch — August" />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Template</Label>
            <Select value={form.template_id} onValueChange={(v) => { set("template_id")(v); const t = templates.find((t) => t.id === v); if (t) set("channel")(t.channel); }}>
              <SelectTrigger className="bg-zinc-950/50 border-zinc-700"><SelectValue placeholder="Select template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.channel})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Target Audience</Label>
            <Select value={form.target_audience} onValueChange={set("target_audience")}>
              <SelectTrigger className="bg-zinc-950/50 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.target_audience === "custom" && (
            <div>
              <Label className="text-xs text-zinc-400">Email Addresses (comma-separated)</Label>
              <Input value={form.target_emails} onChange={(e) => set("target_emails")(e.target.value)} className="bg-zinc-950/50 border-zinc-700" placeholder="a@x.com, b@x.com" />
            </div>
          )}
          <div>
            <Label className="text-xs text-zinc-400">Schedule (leave empty for on-demand)</Label>
            <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => set("scheduled_at")(e.target.value)} className="bg-zinc-950/50 border-zinc-700" />
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-950/50 rounded-lg p-2.5 border border-zinc-800">
            <Users className="w-3.5 h-3.5 text-lime-400" /> {recipientCount} recipients will receive this campaign
          </div>
          {result?.error && <p className="text-sm text-red-400">{result.error}</p>}
          {result && !result.error && (
            <p className="text-sm text-lime-400">Dispatched: {result.sent} sent, {result.failed} failed of {result.total}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-700" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" className="border-zinc-700" disabled={dispatching || !form.name || !form.template_id} onClick={() => handleCreate(false)}>
            Save as Draft
          </Button>
          <Button className="bg-lime-600 hover:bg-lime-700 text-white" disabled={dispatching || !form.name || !form.template_id} onClick={() => handleCreate(true)}>
            {dispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Dispatch Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}