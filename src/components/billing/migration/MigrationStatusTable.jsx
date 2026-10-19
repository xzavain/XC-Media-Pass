import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Zap, ShieldCheck } from "lucide-react";
import { activateMigration } from "@/lib/migrationApi";
import { useAuth } from "@/lib/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  imported: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  activated: "bg-lime-500/10 text-lime-400 border-lime-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  skipped: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const SOURCE_BADGE = { stripe: "bg-violet-500/10 text-violet-400", paypal: "bg-sky-500/10 text-sky-400" };

export default function MigrationStatusTable({ migrations, plans, onActivated }) {
  const [activating, setActivating] = useState(null);
  const [planMap, setPlanMap] = useState({});
  const [confirmMigration, setConfirmMigration] = useState(null);
  const { user } = useAuth();

  const handleActivate = async (migration) => {
    const planId = planMap[migration.id];
    if (!planId) return;
    setActivating(migration.id);
    try {
      await activateMigration(migration, planId, { name: user?.full_name, email: user?.email });
      onActivated?.();
    } finally {
      setActivating(null);
      setConfirmMigration(null);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800/60">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Zap className="w-4 h-4 text-lime-400" /> Migration Queue
          <span className="ml-auto text-xs text-zinc-500 font-normal">{migrations.length} records</span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/40 border-b border-zinc-800/60">
            <tr>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase">Source</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase">Customer</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase">Original Plan</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase">Price</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase">Signup</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase">Status</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase">Map to Plan & Activate</th>
            </tr>
          </thead>
          <tbody>
            {migrations.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-zinc-500">No migration records yet — import from a source above</td></tr>
            ) : (
              migrations.map((m) => (
                <tr key={m.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/30">
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${SOURCE_BADGE[m.source] || "bg-zinc-700 text-zinc-300"}`}>
                      {m.source}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-zinc-200 truncate max-w-[160px]">{m.customer_name || "—"}</p>
                    <p className="text-xs text-zinc-500 truncate max-w-[160px]">{m.customer_email}</p>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300 truncate max-w-[140px]">{m.original_plan_name || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-300">${m.original_price?.toFixed(2) || "0.00"}</td>
                  <td className="px-3 py-2.5 text-zinc-400 text-xs">{m.signup_date ? new Date(m.signup_date).toLocaleDateString() : "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status] || STATUS_STYLES.pending}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {m.status === "activated" ? (
                      <span className="text-xs text-lime-400">Activated</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select value={planMap[m.id] || ""} onValueChange={(v) => setPlanMap((p) => ({ ...p, [m.id]: v }))}>
                          <SelectTrigger className="bg-zinc-950/50 h-8 w-36 text-xs"><SelectValue placeholder="Select plan" /></SelectTrigger>
                          <SelectContent>
                            {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-8 bg-lime-600 hover:bg-lime-700 text-white text-xs"
                          disabled={!planMap[m.id] || activating === m.id}
                          onClick={() => setConfirmMigration(m)}
                        >
                          {activating === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Activate"}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!confirmMigration} onOpenChange={(v) => !v && setConfirmMigration(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Activate this migration locally?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will create or update a customer record in <span className="text-zinc-200">this platform's database only</span>.
              It will not modify, cancel, or contact anything on the source platform
              {confirmMigration ? ` (${confirmMigration.source})` : ""}.
              The customer's external subscription remains completely untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-lime-500/30 bg-lime-500/5 p-3 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-lime-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400">
              No emails will be sent. No external API calls will be made. This is a local database operation only.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-lime-600 hover:bg-lime-700 text-white"
              disabled={activating === confirmMigration?.id}
              onClick={() => confirmMigration && handleActivate(confirmMigration)}
            >
              {activating === confirmMigration?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm — Local Only"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}