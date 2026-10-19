import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquarePlus } from "lucide-react";

export default function CannedReplyPicker({ onInsert }) {
  const [replies, setReplies] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    base44.entities.CannedReply.list().then(setReplies).catch(() => {});
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (replies.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" /> Canned
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-72 max-h-64 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50">
          {replies.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onInsert(r.body); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-zinc-800 border-b border-zinc-800/50 last:border-0"
            >
              <p className="text-xs font-medium text-zinc-200">{r.title}</p>
              <p className="text-[11px] text-zinc-500 truncate">{r.body}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}