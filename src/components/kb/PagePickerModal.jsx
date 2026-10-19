import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function PagePickerModal({ open, onOpenChange, onPick, excludePageId }) {
  const [pages, setPages] = useState([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const list = await base44.entities.KbPage.list("-updated_date", 200);
    setPages(list.filter((p) => p.id !== excludePageId));
  }, [excludePageId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const filtered = pages.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[70vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Link to Page</DialogTitle></DialogHeader>
        <Input
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
        />
        <div className="space-y-1 mt-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-6">No pages found.</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => { onPick(p); onOpenChange(false); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/50 text-sm text-zinc-300"
              >
                {p.title}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}