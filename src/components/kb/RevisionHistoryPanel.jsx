import React from "react";
import moment from "moment";
import { History } from "lucide-react";

export default function RevisionHistoryPanel({ revisions, onRestore, canManage }) {
  if (revisions.length === 0) {
    return <p className="text-xs text-zinc-600">No revisions yet.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 uppercase font-semibold">
        <History className="w-3.5 h-3.5" /> Revision History
      </div>
      {revisions.map((rev) => (
        <div key={rev.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-800/60 bg-zinc-900/40">
          <div>
            <p className="text-xs text-zinc-300">v{rev.version} · {rev.editor_name || rev.editor_email || "Unknown"}</p>
            <p className="text-[11px] text-zinc-600">{moment(rev.created_date).format("MMM D, YYYY h:mm A")}</p>
          </div>
          {canManage && (
            <button onClick={() => onRestore(rev)} className="text-xs text-lime-400 hover:text-lime-300 font-medium">
              Restore
            </button>
          )}
        </div>
      ))}
    </div>
  );
}