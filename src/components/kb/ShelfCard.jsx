import React from "react";
import { Link } from "react-router-dom";
import { Library } from "lucide-react";

export default function ShelfCard({ shelf, bookCount }) {
  return (
    <Link
      to={`/kb/shelf/${shelf.id}`}
      className="flex flex-col p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-800/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <Library className="w-4 h-4 text-lime-400" />
        <h3 className="text-sm font-semibold text-zinc-100 truncate">{shelf.name}</h3>
      </div>
      <p className="text-xs text-zinc-500 line-clamp-2 flex-1">{shelf.description}</p>
      <p className="text-[11px] text-zinc-600 mt-3">{bookCount} book{bookCount === 1 ? "" : "s"}</p>
    </Link>
  );
}