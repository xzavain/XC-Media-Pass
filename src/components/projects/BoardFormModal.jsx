import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { BOARD_TYPES } from "@/lib/projectUtils";

export default function BoardFormModal({ open, onClose, onSave, board }) {
  const [form, setForm] = useState({ name: "", board_type: "status" });

  useEffect(() => {
    if (!open) return;
    if (board) {
      setForm({ name: board.name || "", board_type: board.board_type || "status" });
    } else {
      setForm({ name: "", board_type: "status" });
    }
  }, [board, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{board ? "Edit Board" : "New Board"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Board Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Sprint Board, Bug Triage" className="bg-zinc-800 border-zinc-700 mt-1" />
          </div>
          <div>
            <Label>Board Type</Label>
            <Select value={form.board_type} onValueChange={(v) => setForm({ ...form, board_type: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {Object.entries(BOARD_TYPES).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span>{cfg.label}</span>
                      <span className="text-xs text-zinc-500">{cfg.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-lime-600 hover:bg-lime-700 text-white">{board ? "Save" : "Create Board"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}