import React, { useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";

export default function AddonProductManager({ addons, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", price: 0, billing_cycle: "monthly", category: "", platform: "other", features: [], visibility: "public", is_active: true, display_order: 0 });
    setOpen(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({ ...a, features: a.features || [] });
    setOpen(true);
  };

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing?.id) {
        await base44.entities.AddonProduct.update(editing.id, form);
      } else {
        await base44.entities.AddonProduct.create(form);
      }
      setOpen(false);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this add-on product?")) return;
    await base44.entities.AddonProduct.delete(id);
    onChanged?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Add-on Products</h3>
        <Button size="sm" className="bg-lime-600 hover:bg-lime-700 text-white" onClick={openNew}>
          <Plus className="w-3.5 h-3.5" /> New Add-on
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {addons.map((a) => (
          <div key={a.id} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
            <div className="flex items-start justify-between mb-1">
              <p className="text-sm font-medium text-zinc-100">{a.name}</p>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => openEdit(a)}><Pencil className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-400" onClick={() => handleDelete(a.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mb-2">{a.description}</p>
            <p className="text-sm font-bold text-zinc-100">${a.price}<span className="text-xs font-normal text-zinc-500">/{a.billing_cycle === "one_time" ? "one-time" : a.billing_cycle}</span></p>
            <div className="flex items-center gap-2 mt-2">
              {a.category && <span className="text-xs text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">{a.category}</span>}
              <span className={`text-xs ${a.is_active ? "text-lime-400" : "text-zinc-600"}`}>{a.is_active ? "Active" : "Inactive"}</span>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Add-on" : "New Add-on Product"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-zinc-400">Name</Label>
                <Input value={form.name} onChange={(e) => set("name")(e.target.value)} className="bg-zinc-950/50 border-zinc-700" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Description</Label>
                <Textarea value={form.description} onChange={(e) => set("description")(e.target.value)} className="bg-zinc-950/50 border-zinc-700 min-h-[60px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-zinc-400">Price</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => set("price")(parseFloat(e.target.value) || 0)} className="bg-zinc-950/50 border-zinc-700" />
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Billing Cycle</Label>
                  <Select value={form.billing_cycle} onValueChange={set("billing_cycle")}>
                    <SelectTrigger className="bg-zinc-950/50 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-zinc-400">Category</Label>
                  <Input value={form.category} onChange={(e) => set("category")(e.target.value)} className="bg-zinc-950/50 border-zinc-700" placeholder="Extra Streams, VPN..." />
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Platform</Label>
                  <Select value={form.platform} onValueChange={set("platform")}>
                    <SelectTrigger className="bg-zinc-950/50 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plex">Plex</SelectItem>
                      <SelectItem value="jellyfin">Jellyfin</SelectItem>
                      <SelectItem value="emby">Emby</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Features (comma-separated)</Label>
                <Input value={Array.isArray(form.features) ? form.features.join(", ") : form.features} onChange={(e) => set("features")(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className="bg-zinc-950/50 border-zinc-700" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-zinc-700" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-lime-600 hover:bg-lime-700 text-white" disabled={saving || !form?.name} onClick={handleSave}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}