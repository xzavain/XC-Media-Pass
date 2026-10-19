import React from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

export default function BookCard({ book, pageCount }) {
  return (
    <Link
      to={`/kb/book/${book.id}`}
      className="flex flex-col p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-800/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-lime-400" />
        <h3 className="text-sm font-semibold text-zinc-100 truncate">{book.title}</h3>
      </div>
      <p className="text-xs text-zinc-500 line-clamp-2 flex-1">{book.description}</p>
      <p className="text-[11px] text-zinc-600 mt-3">{pageCount} page{pageCount === 1 ? "" : "s"}</p>
    </Link>
  );
}