import React from "react";
import { Plus, Pencil, Trash2, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const CATEGORY_STYLES = {
  welcome: "bg-lime-500/10 text-lime-400 border-lime-500/20",
  billing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  migration: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  broadcast: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  discord: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  custom: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function TemplateList({ templates, onEdit, onNew, onChanged }) {
  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    await base44.entities.EmailTemplate.delete(id);
    onChanged?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Email & Discord Templates</h3>
        <Button size="sm" className="bg-lime-600 hover:bg-lime-700 text-white" onClick={onNew}>
          <Plus className="w-3.5 h-3.5" /> New Template
        </Button>
      </div>
      <div className="grid gap-2">
        {templates.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-8 text-center text-sm text-zinc-500">
            No templates yet — create one to get started
          </div>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                {t.channel === "discord" ? <MessageSquare className="w-4 h-4 text-indigo-400" /> : <Mail className="w-4 h-4 text-lime-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-zinc-100 font-medium truncate">{t.name}</p>
                  <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[t.category] || CATEGORY_STYLES.custom}`}>
                    {t.category}
                  </span>
                  {!t.is_active && <span className="text-xs text-zinc-600">inactive</span>}
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">{t.subject || "No subject"}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-zinc-200" onClick={() => onEdit(t)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-400" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}