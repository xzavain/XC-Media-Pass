import React from "react";
import { MessageSquare } from "lucide-react";
import { PREDEFINED_KILL_MESSAGES } from "@/lib/killMessages";

// Clickable list of standard stop-stream notices. Selecting one fills the
// dialog's message field; the admin can then edit it or send as-is.
export default function PredefinedMessageList({ onSelect }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-zinc-500">Quick messages</p>
      <div className="flex flex-col gap-1.5">
        {PREDEFINED_KILL_MESSAGES.map((m) => (
          <button
            key={m.label}
            type="button"
            onClick={() => onSelect(m.message)}
            className="flex items-start gap-2 text-left px-3 py-2 rounded-md border border-zinc-700/60 bg-zinc-800/40 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-lime-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-200">{m.label}</p>
              <p className="text-xs text-zinc-500 truncate">{m.message}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}