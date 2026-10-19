import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getStaffList } from "@/lib/projectUtils";

export default function ProjectFormModal({ open, onClose, onSave, project, user }) {
  const [form, setForm] = useState({ name: "", description: "", visibility: "public", member_emails: [] });
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    if (!open) return;
    getStaffList().then(setStaff);
    if (project) {
      setForm({
        name: project.name || "",
        description: project.description || "",
        visibility: project.visibility || "public",
        member_emails: project.member_emails || [],
      });
    } else {
      setForm({ name: "", description: "", visibility: "public", member_emails: [] });
    }
  }, [project, open]);

  const toggleMember = (email) => {
    setForm((prev) => ({
      ...prev,
      member_emails: prev.member_emails.includes(email)
        ? prev.member_emails.filter((e) => e !== email)
        : [...prev.member_emails, email],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-zinc-800 border-zinc-700 mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="bg-zinc-800 border-zinc-700 mt-1" />
          </div>
          <div>
            <Label>Visibility</Label>
            <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="public">Public — visible to all staff</SelectItem>
                <SelectItem value="private">Private — visible to members & admins only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.visibility === "private" && (
            <div>
              <Label>Team Members</Label>
              <div className="mt-1 max-h-40 overflow-y-auto space-y-1 rounded-lg border border-zinc-700 bg-zinc-800/50 p-2">
                {staff.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-zinc-200 cursor-pointer hover:bg-zinc-800/60 rounded px-2 py-1">
                    <input type="checkbox" checked={form.member_emails.includes(s.email)} onChange={() => toggleMember(s.email)} className="accent-lime-500" />
                    {s.full_name || s.email}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-lime-600 hover:bg-lime-700 text-white">{project ? "Save Changes" : "Create Project"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}