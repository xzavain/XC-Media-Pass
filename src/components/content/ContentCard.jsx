import React from "react";
import { Pencil, Trash2, Lock, Unlock, Film } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContentCard({ item, planNames, onEdit, onDelete }) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden group">
      <div className="aspect-video bg-zinc-800 flex items-center justify-center">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <Film className="w-8 h-8 text-zinc-600" />
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-white truncate">{item.title}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${item.status === "published" ? "bg-lime-500/10 text-lime-400" : "bg-zinc-700 text-zinc-400"}`}>
            {item.status}
          </span>
        </div>
        <p className="text-xs text-zinc-500 capitalize">{item.content_type} {item.category && `· ${item.category}`}</p>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          {item.is_free ? (
            <><Unlock className="w-3 h-3 text-lime-400" /> Free for all</>
          ) : (
            <><Lock className="w-3 h-3 text-amber-400" /> {planNames.length > 0 ? planNames.join(", ") : "No plan assigned"}</>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="border-zinc-700 flex-1 gap-1.5" onClick={() => onEdit(item)}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="border-zinc-700 text-red-400 hover:text-red-300" onClick={() => onDelete(item)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}