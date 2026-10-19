import React, { useState, useEffect, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Loader2, Paperclip, X, FileText } from "lucide-react";
import { WORK_PACKAGE_TYPES, PRIORITY_CONFIG } from "@/lib/projectUtils";

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
};

const emptyTask = {
  title: "", description: "", work_package_type: "task", priority: "medium",
  story_points: 0, estimated_hours: 0, assignee_emails: [], assignee_names: [],
  start_date: "", due_date: "", milestone: "", parent_task_id: "", tags: [],
};

function detectType(file) {
  if (file.type === "image/gif") return "gif";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf" || file.type.includes("document") || file.type.includes("sheet")) return "document";
  return "other";
}

export default function TaskFormModal({ open, onClose, onSave, task, user, staffList, projectTasks, preset }) {
  const [form, setForm] = useState(emptyTask);
  const [tagInput, setTagInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setNewFiles([]);
    setTagInput("");
    if (task) {
      setForm({
        ...emptyTask,
        ...task,
        assignee_emails: task.assignee_emails || [],
        assignee_names: task.assignee_names || [],
        tags: task.tags || [],
        checklist: task.checklist || [],
        linked_ticket_ids: task.linked_ticket_ids || [],
        depends_on: task.depends_on || [],
      });
      base44.entities.TaskAttachment.filter({ task_id: task.id }).then(setAttachments);
    } else {
      setForm({ ...emptyTask, ...preset });
      setAttachments([]);
    }
  }, [task, open, preset]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const meta = { file_name: file.name, file_url, file_type: detectType(file), file_size: file.size, uploaded_by_name: user?.full_name, uploaded_by_email: user?.email };
      if (task) {
        const created = await base44.entities.TaskAttachment.create({ ...meta, task_id: task.id });
        setAttachments((prev) => [...prev, created]);
      } else {
        setNewFiles((prev) => [...prev, meta]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const toggleAssignee = (email, name) => {
    setForm((prev) => {
      const has = prev.assignee_emails.includes(email);
      return {
        ...prev,
        assignee_emails: has ? prev.assignee_emails.filter((e) => e !== email) : [...prev.assignee_emails, email],
        assignee_names: has ? prev.assignee_names.filter((n) => n !== name) : [...prev.assignee_names, name],
      };
    });
  };

  const addTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form, newFiles);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Work Package" : "New Work Package"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-zinc-800 border-zinc-700 mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <div className="kb-editor rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800 mt-1">
              <ReactQuill theme="snow" value={form.description} onChange={(v) => setForm({ ...form, description: v })} modules={quillModules} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.work_package_type} onValueChange={(v) => setForm({ ...form, work_package_type: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {Object.entries(WORK_PACKAGE_TYPES).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {Object.entries(PRIORITY_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Story Points</Label>
              <Input type="number" min="0" value={form.story_points} onChange={(e) => setForm({ ...form, story_points: parseFloat(e.target.value) || 0 })} className="bg-zinc-800 border-zinc-700 mt-1" />
            </div>
            <div>
              <Label>Estimated Hours</Label>
              <Input type="number" min="0" step="0.25" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: parseFloat(e.target.value) || 0 })} className="bg-zinc-800 border-zinc-700 mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="bg-zinc-800 border-zinc-700 mt-1" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="bg-zinc-800 border-zinc-700 mt-1" />
            </div>
          </div>
          <div>
            <Label>Milestone / Version</Label>
            <Input value={form.milestone || ""} onChange={(e) => setForm({ ...form, milestone: e.target.value })} placeholder="e.g. v1.0, Sprint 5" className="bg-zinc-800 border-zinc-700 mt-1" />
          </div>
          <div>
            <Label>Parent Task</Label>
            <Select value={form.parent_task_id || "none"} onValueChange={(v) => setForm({ ...form, parent_task_id: v === "none" ? "" : v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="none">No parent (top-level)</SelectItem>
                {(projectTasks || []).filter((t) => t.id !== task?.id).map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assignees</Label>
            <div className="mt-1 max-h-32 overflow-y-auto space-y-1 rounded-lg border border-zinc-700 bg-zinc-800/50 p-2">
              {(staffList || []).map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-zinc-200 cursor-pointer hover:bg-zinc-800/60 rounded px-2 py-1">
                  <Checkbox checked={form.assignee_emails.includes(s.email)} onCheckedChange={() => toggleAssignee(s.email, s.full_name)} />
                  {s.full_name || s.email}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1 mb-1">
              {form.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-0.5">
                  {tag}
                  <button type="button" onClick={() => setForm({ ...form, tags: form.tags.filter((t) => t !== tag) })}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <form onSubmit={addTag} className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag…" className="bg-zinc-800 border-zinc-700 text-zinc-100 h-8" />
            </form>
          </div>
          <div>
            <Label>Attachments</Label>
            <div className="mt-1 space-y-2">
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm">
                  <a href={a.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-zinc-200 hover:text-lime-400 truncate">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{a.file_name}</span>
                  </a>
                  <button type="button" onClick={() => { base44.entities.TaskAttachment.delete(a.id); setAttachments((prev) => prev.filter((x) => x.id !== a.id)); }} className="text-zinc-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm">
                  <span className="flex items-center gap-2 text-zinc-200 truncate"><Paperclip className="w-3.5 h-3.5" /> {f.file_name}</span>
                  <button type="button" onClick={() => setNewFiles((prev) => prev.filter((_, x) => x !== i))} className="text-zinc-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()} className="border-zinc-700 gap-1.5">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Attach File
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-lime-600 hover:bg-lime-700 text-white">{task ? "Save" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}