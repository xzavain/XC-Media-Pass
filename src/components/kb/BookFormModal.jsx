import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/kb/RichTextEditor";
import { Loader2 } from "lucide-react";

export default function BookFormModal({ open, onOpenChange, onCreated }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shelves, setShelves] = useState([]);
  const [selectedShelfIds, setSelectedShelfIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.KbShelf.list("-order", 200).then(setShelves).catch(() => {});
    }
  }, [open]);

  const toggleShelf = (id) => {
    setSelectedShelfIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const created = await base44.entities.KbBook.create({
        title,
        description,
        shelf_ids: selectedShelfIds,
        created_by_name: user?.full_name,
        created_by_email: user?.email,
      });
      // Update each selected shelf's book_ids
      for (const shelfId of selectedShelfIds) {
        const shelf = shelves.find((s) => s.id === shelfId);
        if (shelf) {
          await base44.entities.KbShelf.update(shelfId, {
            book_ids: [...(shelf.book_ids || []), created.id],
          });
        }
      }
      setTitle(""); setDescription(""); setSelectedShelfIds([]);
      onCreated();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
        <DialogHeader><DialogTitle>New Book</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Book title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
          <div>
            <Label className="text-xs text-zinc-400 mb-1.5 block">Description</Label>
            <RichTextEditor value={description} onChange={setDescription} user={user} />
          </div>
          {shelves.length > 0 && (
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">Add to Shelves</Label>
              <div className="flex flex-wrap gap-2">
                {shelves.map((shelf) => (
                  <button
                    key={shelf.id}
                    type="button"
                    onClick={() => toggleShelf(shelf.id)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      selectedShelfIds.includes(shelf.id)
                        ? "bg-lime-600/20 border-lime-500/40 text-lime-300"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {shelf.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-700" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}