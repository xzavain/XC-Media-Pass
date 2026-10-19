import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import PlanLibraryMapper from "@/components/store/PlanLibraryMapper";

const emptyPlan = {
  name: "",
  description: "",
  category: "",
  platform: "other",
  price: 0,
  billing_interval: "monthly",
  features: "",
  visibility: "public",
  is_active: true,
  stripe_price_id: "",
  server: "XC Echo",
  live_tv_credits: 0,
  library_map: [],
  max_concurrent_streams: 0,
  block_4k_transcode: false,
};

export default function PlanFormModal({ open, onClose, onSave, plan }) {
  const [form, setForm] = useState(emptyPlan);

  useEffect(() => {
    if (plan) {
      setForm({ ...plan, features: (plan.features || []).join(", ") });
    } else {
      setForm(emptyPlan);
    }
  }, [plan, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      live_tv_credits: Number(form.live_tv_credits) || 0,
      max_concurrent_streams: Number(form.max_concurrent_streams) || 0,
      block_4k_transcode: form.block_4k_transcode,
      features: form.features
        ? form.features.split(",").map((f) => f.trim()).filter(Boolean)
        : [],
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit Plan" : "New Plan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Plex" required />
            </div>
            <div>
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plex">Plex</SelectItem>
                  <SelectItem value="jellyfin">Jellyfin</SelectItem>
                  <SelectItem value="emby">Emby</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price ($)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div>
              <Label>Billing Interval</Label>
              <Select value={form.billing_interval} onValueChange={(v) => setForm({ ...form, billing_interval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Billing Server</Label>
              <Select value={form.server} onValueChange={(v) => setForm({ ...form, server: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="XC Echo">XC Echo</SelectItem>
                  <SelectItem value="XC Foxtrot">XC Foxtrot</SelectItem>
                  <SelectItem value="Live TV">Live TV</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-400 mt-1">Used to allocate expenses in the Billing Engine</p>
            </div>
            <div>
              <Label>Live TV Credits</Label>
              <Input type="number" step="0.1" value={form.live_tv_credits} onChange={(e) => setForm({ ...form, live_tv_credits: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Max Concurrent Streams</Label>
            <Input type="number" step="1" min="0" value={form.max_concurrent_streams} onChange={(e) => setForm({ ...form, max_concurrent_streams: e.target.value })} placeholder="0 = unlimited" />
            <p className="text-xs text-zinc-400 mt-1">Overflow streams are auto-stopped while the Sessions page is open</p>
          </div>
          <div className="flex items-center justify-between border border-zinc-800 rounded-lg px-3 py-2">
            <div>
              <Label className="block">Block 4K Transcoding</Label>
              <p className="text-xs text-zinc-400">Auto-stops sessions transcoding 4K content on this plan</p>
            </div>
            <Switch
              checked={form.block_4k_transcode}
              onCheckedChange={(v) => setForm({ ...form, block_4k_transcode: v })}
            />
          </div>
          <div>
            <Label>Stripe Price ID</Label>
            <Input value={form.stripe_price_id} onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })} placeholder="price_xxx" />
            <p className="text-xs text-zinc-400 mt-1">Required for customers to be able to check out this plan</p>
          </div>
          <PlanLibraryMapper
            libraryMap={form.library_map || []}
            onChange={(library_map) => setForm({ ...form, library_map })}
          />
          <div>
            <Label>Features (comma separated)</Label>
            <Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="4K streaming, 2 screens, ..." />
          </div>
          <div className="flex items-center justify-between border border-zinc-800 rounded-lg px-3 py-2">
            <div>
              <Label className="block">Public</Label>
              <p className="text-xs text-zinc-400">Hidden plans only work via their direct checkout link</p>
            </div>
            <Switch
              checked={form.visibility === "public"}
              onCheckedChange={(v) => setForm({ ...form, visibility: v ? "public" : "hidden" })}
            />
          </div>
          <div className="flex items-center justify-between border border-zinc-800 rounded-lg px-3 py-2">
            <Label>Active</Label>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Plan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}