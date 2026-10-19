import React from "react";
import { AVAILABLE_SHORTCODES } from "@/lib/emailShortcodes";
import { Tag } from "lucide-react";

export default function ShortcodeReference() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
      <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-3">
        <Tag className="w-3.5 h-3.5 text-lime-400" /> Available Shortcodes
      </h4>
      <p className="text-xs text-zinc-500 mb-3">Use <code className="text-lime-400 bg-zinc-950/50 px-1 rounded">*key*</code> format in subject and body</p>
      <div className="space-y-2">
        {AVAILABLE_SHORTCODES.map((sc) => (
          <div key={sc.key} className="flex items-start gap-2 text-xs">
            <code className="text-lime-400 bg-zinc-950/50 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">*{sc.key}*</code>
            <div>
              <p className="text-zinc-300">{sc.label}</p>
              <p className="text-zinc-600">{sc.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}