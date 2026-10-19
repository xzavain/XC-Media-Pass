import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, " ");
}

export default function KbSearchBar({ user }) {
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const list = await base44.entities.KbPage.list("-updated_date", 500);
    setPages(list);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isStaff = user?.role === "admin" || user?.role === "staff";
  const q = query.trim().toLowerCase();

  const results = q
    ? pages
        .filter((p) => isStaff || p.status === "published" || p.author_email === user?.email)
        .filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            stripHtml(p.content).toLowerCase().includes(q) ||
            (p.tags || []).some((t) => t.toLowerCase().includes(q))
        )
        .slice(0, 8)
    : [];

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search the knowledge base..."
          className="bg-zinc-800 border-zinc-700 text-zinc-100 pl-9"
        />
      </div>
      {open && q && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-4">No results.</p>
          ) : (
            results.map((p) => (
              <Link
                key={p.id}
                to={`/kb/page/${p.id}`}
                className="block px-3 py-2 hover:bg-zinc-800/60 text-sm text-zinc-300 border-b border-zinc-800/60 last:border-none"
              >
                {p.title}
                {p.status === "draft" && <span className="ml-2 text-[10px] text-amber-400">Draft</span>}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}