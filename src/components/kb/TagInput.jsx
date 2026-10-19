import React, { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function TagInput({ tags, onChange }) {
  const [value, setValue] = useState("");

  const addTag = () => {
    const t = value.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setValue("");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-zinc-700 bg-zinc-800">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-lime-500/10 text-lime-400 border border-lime-500/20">
          {tag}
          <button onClick={() => onChange(tags.filter((t) => t !== tag))}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
        onBlur={addTag}
        placeholder="Add tag..."
        className="flex-1 min-w-[100px] h-7 border-none bg-transparent text-zinc-100 focus-visible:ring-0 p-0"
      />
    </div>
  );
}