import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import TemplateList from "@/components/billing/templates/TemplateList";
import TemplateEditor from "@/components/billing/templates/TemplateEditor";

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(async () => {
    const t = await base44.entities.EmailTemplate.list("-created_date", 200);
    setTemplates(t);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleNew = () => { setEditing(null); setEditorOpen(true); };
  const handleEdit = (t) => { setEditing(t); setEditorOpen(true); };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <Link to="/billing" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft className="w-3 h-3" /> Billing Engine
      </Link>
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
          <Mail className="w-6 h-6 text-lime-400" /> Email & Discord Templates
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Manage reusable message templates with shortcode personalization (*name*, *plan*, *price*)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-lime-400" /></div>
      ) : (
        <TemplateList templates={templates} onEdit={handleEdit} onNew={handleNew} onChanged={load} />
      )}

      <TemplateEditor template={editing} open={editorOpen} onOpenChange={setEditorOpen} onSaved={load} />
    </div>
  );
}