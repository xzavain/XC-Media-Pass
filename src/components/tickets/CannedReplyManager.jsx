import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

export default function CannedReplyManager() {
  const { user } = useAuth();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const list = await base44.entities.CannedReply.list("-created_date", 200);
    setReplies(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    await base44.entities.CannedReply.delete(id);
    load();
  };

  const startEdit = (r) => { setEditing(r); setShowForm(true); };
  const startNew = () => { setEditing(null); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Pre-written replies staff can insert into ticket conversations.</p>
        <Button onClick={startNew} size="sm" className="bg-lime-600 hover:bg-lime-700 text-white gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Reply
        </Button>
      </div>

      {showForm && (
        <CannedReplyForm
          existing={editing}
          user={user}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
      ) : replies.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-6">No canned replies yet.</p>
      ) : (
        <div className="space-y-2">
          {replies.map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/60 bg-zinc-900/40">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-zinc-200">{r.title}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{r.category}</span>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2">{r.body}</p>
              </div>
              <button onClick={() => startEdit(r)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CannedReplyForm({ existing, user, onSaved, onCancel }) {
  const [title, setTitle] = useState(existing?.title || "");
  const [body, setBody] = useState(existing?.body || "");
  const [category, setCategory] = useState(existing?.category || "general");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (existing) {
        await base44.entities.CannedReply.update(existing.id, { title, body, category });
      } else {
        await base44.entities.CannedReply.create({
          title, body, category,
          created_by_name: user?.full_name || user?.email,
          created_by_email: user?.email,
        });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3 p-4 rounded-lg border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-200">{existing ? "Edit Reply" : "New Canned Reply"}</p>
        <button type="button" onClick={onCancel}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-300" /></button>
      </div>
      <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          {["general", "billing", "troubleshooting", "onboarding"].map((c) => (
            <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reply body..." rows={4} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} size="sm" className="bg-lime-600 hover:bg-lime-700 text-white">
          {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />} Save
        </Button>
        <Button type="button" onClick={onCancel} size="sm" variant="outline" className="border-zinc-700 text-zinc-300">Cancel</Button>
      </div>
    </form>
  );
}