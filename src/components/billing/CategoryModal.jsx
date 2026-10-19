import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function CategoryModal({ category, open, onClose }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [tokens, setTokens] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name || ""); setSlug(category.slug || ""); setColor(category.color_hex || "#3B82F6");
      setTokens((category.match_tokens || []).join(", ")); setDesc(category.description || "");
    } else { setName(""); setSlug(""); setColor("#3B82F6"); setTokens(""); setDesc(""); }
  }, [category]);

  const handleSave = async () => {
    if (!name) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const data = { name, slug: slug || name.toLowerCase().replace(/\s+/g, "-"), color_hex: color, match_tokens: tokens.split(",").map((t) => t.trim()).filter(Boolean), description: desc };
      if (category) await base44.entities.SubscriptionCategory.update(category.id, data);
      else await base44.entities.SubscriptionCategory.create(data);
      toast({ title: "Category saved" }); onClose();
    } catch (err) { toast({ title: "Save failed", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-800 text-zinc-100 max-w-lg">
        <DialogHeader><DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-zinc-300 text-sm">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" /></div>
            <div><Label className="text-zinc-300 text-sm">Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto" className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" /></div>
          </div>
          <div>
            <Label className="text-zinc-300 text-sm">Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-9 rounded bg-slate-900 border border-slate-700" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="bg-slate-900 border-slate-700 text-zinc-100" />
            </div>
          </div>
          <div><Label className="text-zinc-300 text-sm">Match Tokens (comma-separated, regex allowed)</Label><Input value={tokens} onChange={(e) => setTokens(e.target.value)} placeholder="Foxtrot, XC P" className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" /></div>
          <div><Label className="text-zinc-300 text-sm">Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="bg-slate-900 border-slate-700 text-zinc-100 mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-zinc-300 hover:bg-slate-800">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700 text-white">{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}