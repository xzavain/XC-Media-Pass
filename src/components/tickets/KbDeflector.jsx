import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, Loader2, ArrowUpRight } from "lucide-react";

export default function KbDeflector({ subject, description }) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [show, setShow] = useState(false);
  const debounceRef = useRef(null);
  const [allPages, setAllPages] = useState([]);

  useEffect(() => {
    base44.entities.KbPage.filter({ status: "published" }, "title", 50)
      .then(setAllPages)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const query = `${subject} ${description}`.trim();
    if (query.length < 5) { setResults([]); setShow(false); return; }
    clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      const q = query.toLowerCase();
      const matches = allPages
        .filter((p) => p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q))
        .slice(0, 4);
      setResults(matches);
      setShow(matches.length > 0);
      setSearching(false);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [subject, description, allPages]);

  if (!show && !searching) return null;

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
        <BookOpen className="w-4 h-4" />
        Before submitting, do any of these solve your issue?
      </div>
      {searching ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Searching knowledge base...
        </div>
      ) : (
        <div className="space-y-1.5">
          {results.map((p) => (
            <a
              key={p.id}
              href={`/customer/kb/page/${p.id}`}
              className="flex items-center justify-between gap-2 text-sm text-slate-300 hover:text-white bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800 hover:border-indigo-500/30 transition-colors"
            >
              <span className="truncate">{p.title}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}