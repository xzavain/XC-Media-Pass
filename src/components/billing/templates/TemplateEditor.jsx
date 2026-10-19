import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { applyShortcodes, buildTemplateContext, extractShortcodes } from "@/lib/emailShortcodes";
import { useAuth } from "@/lib/AuthContext";
import ShortcodeReference from "./ShortcodeReference";

const CATEGORIES = [
  { value: "welcome", label: "Welcome / Onboarding" },
  { value: "billing", label: "Billing" },
  { value: "migration", label: "Migration" },
  { value: "broadcast", label: "Broadcast" },
  { value: "discord", label: "Discord" },
  { value: "custom", label: "Custom" },
];

export default function TemplateEditor({ template, open, onOpenChange, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name || "",
        subject: template.subject || "",
        body: template.body || "",
        category: template.category || "custom",
        channel: template.channel || "email",
        is_active: template.is_active !== false,
      });
    } else {
      setForm({ name: "", subject: "", body: "", category: "custom", channel: "email", is_active: true });
    }
  }, [template, open]);

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const previewContext = useMemo(() => {
    return buildTemplateContext({
      user_name: "Jane Doe",
      email: "jane@example.com",
      billed_price: 9.99,
      bill_date: "2026-09-01",
      billing_cycle: "monthly",
    }, { name: "Premium Plex" });
  }, []);

  const previewSubject = useMemo(() => applyShortcodes(form?.subject || "", previewContext), [form?.subject, previewContext]);
  const previewBody = useMemo(() => applyShortcodes(form?.body || "", previewContext), [form?.body, previewContext]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        supported_shortcodes: extractShortcodes(`${form.subject} ${form.body}`),
        created_by_name: user?.full_name || "",
        created_by_email: user?.email || "",
      };
      if (template?.id) {
        await base44.entities.EmailTemplate.update(template.id, payload);
      } else {
        await base44.entities.EmailTemplate.create(payload);
      }
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template?.id ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-zinc-400">Template Name</Label>
              <Input value={form.name} onChange={(e) => set("name")(e.target.value)} className="bg-zinc-950/50 border-zinc-700" placeholder="e.g. Welcome Email" />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Category</Label>
              <Select value={form.category} onValueChange={set("category")}>
                <SelectTrigger className="bg-zinc-950/50 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Channel</Label>
              <Select value={form.channel} onValueChange={set("channel")}>
                <SelectTrigger className="bg-zinc-950/50 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Subject {form.channel === "discord" && "(used as title)"}</Label>
              <Input value={form.subject} onChange={(e) => set("subject")(e.target.value)} className="bg-zinc-950/50 border-zinc-700" placeholder="Welcome to *plan*, *name*!" />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Body</Label>
              <Textarea value={form.body} onChange={(e) => set("body")(e.target.value)} className="bg-zinc-950/50 border-zinc-700 min-h-[180px] font-mono text-xs" placeholder={"Hi *name*,\n\nWelcome to *plan*! Your next bill of *price* is on *bill_date*.\n\nManage your subscription: *portal_link*"} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <Eye className="w-3.5 h-3.5 text-lime-400" /> Live Preview
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
              <p className="text-xs text-zinc-500">Subject:</p>
              <p className="text-sm text-zinc-100 font-medium">{previewSubject || "—"}</p>
              <div className="border-t border-zinc-800 pt-2">
                <p className="text-xs text-zinc-500 mb-1">Body:</p>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap">{previewBody || "—"}</p>
              </div>
            </div>
            <ShortcodeReference />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-700" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.body} className="bg-lime-600 hover:bg-lime-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}