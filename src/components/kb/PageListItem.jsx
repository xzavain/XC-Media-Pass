import React from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

export default function PageListItem({ page }) {
  return (
    <Link
      to={`/kb/page/${page.id}`}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors group"
    >
      <FileText className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
      <span className="text-sm text-zinc-300 truncate group-hover:text-zinc-100">{page.title}</span>
      {page.status === "draft" && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
          Draft
        </span>
      )}
    </Link>
  );
}