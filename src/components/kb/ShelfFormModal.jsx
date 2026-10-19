import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function ShelfFormModal({ open, onOpenChange, onCreated }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await base44.entities.KbShelf.create({
        name,
        description,
        created_by_name: user?.full_name,
        created_by_email: user?.email,
      });
      setName(""); setDescription("");
      onCreated();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader><DialogTitle>New Shelf</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Shelf name" value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-700" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Shelf"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}