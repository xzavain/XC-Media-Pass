import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";

const emptyItem = {
  title: "",
  description: "",
  content_type: "movie",
  category: "",
  tags: "",
  thumbnail_url: "",
  file_url: "",
  status: "draft",
  is_free: false,
  allowed_plan_ids: [],
};

export default function ContentFormModal({ open, onClose, onSave, item, plans, user }) {
  const [form, setForm] = useState(emptyItem);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const thumbRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({ ...emptyItem, ...item, tags: (item.tags || []).join(", ") });
    } else {
      setForm(emptyItem);
    }
  }, [item, open]);

  const handleUpload = async (file, field, setLoading) => {
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, [field]: file_url }));
    } finally {
      setLoading(false);
    }
  };

  const togglePlan = (planId) => {
    setForm((f) => {
      const has = f.allowed_plan_ids.includes(planId);
      return {
        ...f,
        allowed_plan_ids: has
          ? f.allowed_plan_ids.filter((id) => id !== planId)
          : [...f.allowed_plan_ids, planId],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      uploaded_by_name: user?.full_name,
      uploaded_by_email: user?.email,
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Content" : "New Content"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="movie">Movie</SelectItem>
                  <SelectItem value="show">Show</SelectItem>
                  <SelectItem value="episode">Episode</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Action" />
            </div>
          </div>
          <div>
            <Label>Tags (comma separated)</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="new, popular, 4k" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Thumbnail</Label>
              <input ref={thumbRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "thumbnail_url", setUploadingThumb)} />
              <Button type="button" variant="outline" size="sm" className="border-zinc-700 w-full gap-1.5 mt-1"
                onClick={() => thumbRef.current?.click()} disabled={uploadingThumb}>
                {uploadingThumb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {form.thumbnail_url ? "Replace" : "Upload"}
              </Button>
            </div>
            <div>
              <Label>Media File</Label>
              <input ref={fileRef} type="file" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "file_url", setUploadingFile)} />
              <Button type="button" variant="outline" size="sm" className="border-zinc-700 w-full gap-1.5 mt-1"
                onClick={() => fileRef.current?.click()} disabled={uploadingFile}>
                {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {form.file_url ? "Replace" : "Upload"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 w-40"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-700 bg-zinc-800/40">
            <div>
              <Label>Free Content</Label>
              <p className="text-xs text-zinc-500">Accessible to all users regardless of plan</p>
            </div>
            <Switch checked={form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: v })} />
          </div>

          {!form.is_free && (
            <div>
              <Label>Required Plans (Tier Access)</Label>
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                {plans.length === 0 && <p className="text-xs text-zinc-500">No store plans found.</p>}
                {plans.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/40 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.allowed_plan_ids.includes(p.id)}
                      onChange={() => togglePlan(p.id)}
                      className="accent-lime-500"
                    />
                    <span className="text-zinc-200">{p.name}</span>
                    <span className="text-zinc-500 text-xs ml-auto">{p.category}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Content</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}