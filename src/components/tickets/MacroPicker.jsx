import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquarePlus, Search } from "lucide-react";

export default function MacroPicker({ onInsert, ticket }) {
  const [macros, setMacros] = useState([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    base44.entities.TicketMacro.list().then(setMacros).catch(() => {});
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applyTemplate = (content) => {
    return content
      .replace(/{{customer_name}}/g, ticket?.customer_name || "")
      .replace(/{{server_name}}/g, ticket?.server_name || "")
      .replace(/{{ticket_number}}/g, ticket?.ticket_number || "")
      .replace(/{{customer_email}}/g, ticket?.customer_email || "");
  };

  const filtered = macros.filter((m) =>
    !search || m.title?.toLowerCase().includes(search.toLowerCase()) || m.shortcut_key?.includes(search)
  );

  if (macros.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" /> Macros
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-80 max-h-72 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl z-50 flex flex-col">
          <div className="p-2 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search macros or type /shortcut..."
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md pl-7 pr-2 py-1.5 focus:outline-none focus:border-indigo-500/40"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onInsert(applyTemplate(m.content));
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 border-b border-slate-800/50 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-200">{m.title}</p>
                  {m.shortcut_key && <code className="text-[10px] text-indigo-400 font-mono">{m.shortcut_key}</code>}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{m.content.substring(0, 80)}</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-slate-600 text-center">No macros found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}