import React, { useState } from "react";
import { Check, Plus, X, ListChecks } from "lucide-react";

export default function TaskChecklist({ checklist, onUpdate }) {
  const [newItem, setNewItem] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    onUpdate([...(checklist || []), { text: newItem.trim(), done: false }]);
    setNewItem("");
  };

  const toggle = (i) => {
    const updated = checklist.map((item, idx) => idx === i ? { ...item, done: !item.done } : item);
    onUpdate(updated);
  };

  const remove = (i) => {
    onUpdate(checklist.filter((_, idx) => idx !== i));
  };

  const edit = (i, text) => {
    const updated = checklist.map((item, idx) => idx === i ? { ...item, text } : item);
    onUpdate(updated);
  };

  const done = (checklist || []).filter((c) => c.done).length;
  const total = (checklist || []).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
        <ListChecks className="w-4 h-4 text-zinc-400" />
        Checklist
        {total > 0 && (
          <span className="text-xs text-zinc-500 ml-auto">{done}/{total} done</span>
        )}
      </div>
      {total > 0 && (
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-lime-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}
      <div className="space-y-1">
        {(checklist || []).map((item, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <button
              onClick={() => toggle(i)}
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${item.done ? "bg-lime-500 border-lime-500" : "border-zinc-600 hover:border-zinc-500"}`}
            >
              {item.done && <Check className="w-3 h-3 text-zinc-900" />}
            </button>
            <input
              value={item.text}
              onChange={(e) => edit(i, e.target.value)}
              className={`flex-1 bg-transparent text-sm border-none outline-none ${item.done ? "line-through text-zinc-500" : "text-zinc-200"}`}
            />
            <button onClick={() => remove(i)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-zinc-500" />
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add checklist item…"
          className="flex-1 bg-transparent text-sm text-zinc-200 border-none outline-none placeholder:text-zinc-600"
        />
      </form>
    </div>
  );
}