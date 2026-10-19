import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/kb/RichTextEditor";
import { Loader2 } from "lucide-react";

export default function ChapterFormModal({ bookId, open, onOpenChange, onCreated }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await base44.entities.KbChapter.create({ book_id: bookId, title, description });
      setTitle(""); setDescription("");
      onCreated();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
        <DialogHeader><DialogTitle>New Chapter</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Chapter title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
          <div>
            <Label className="text-xs text-zinc-400 mb-1.5 block">Description</Label>
            <RichTextEditor value={description} onChange={setDescription} user={user} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-700" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Chapter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}