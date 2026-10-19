import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { STATUS_COLORS } from "@/lib/billingApi";

export default function DateDetailDrawer({ date, subscriptions, categoriesById, gatewaysById, open, onClose }) {
  const total = subscriptions.reduce((s, x) => s + (x.amount || 0), 0);
  const fmt = (n) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="bg-slate-950 border-slate-800 text-zinc-100 w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{date ? date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : ""}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{subscriptions.length} renewal{subscriptions.length !== 1 ? "s" : ""}</span>
            <span className="text-cyan-300 font-semibold">{fmt(total)}</span>
          </div>
          {subscriptions.map((s) => {
            const cat = categoriesById[s.category_id];
            const gw = gatewaysById[s.gateway_account_id];
            const color = cat?.color_hex || "#64748b";
            return (
              <div key={s.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-zinc-200 font-medium truncate">{s.raw_product_name}</span>
                  <span className="text-sm text-zinc-100 font-semibold">{fmt(s.amount || 0)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {cat && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${color}22`, color }}>{cat.name}</span>}
                  {gw && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">{gw.provider}</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLORS[s.status] || ""}`}>{s.status}</span>
                </div>
              </div>
            );
          })}
          {!subscriptions.length && <p className="text-sm text-slate-500">No renewals scheduled.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}