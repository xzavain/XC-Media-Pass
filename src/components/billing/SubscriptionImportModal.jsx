import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { parseCsv, importRows } from "@/lib/billingApi";
import { Upload, Loader2 } from "lucide-react";

export default function SubscriptionImportModal({ open, onClose, gatewayAccountId, categories, plans }) {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    if (!parsed.length) toast({ title: "No rows parsed", variant: "destructive" });
  };

  const handleImport = async () => {
    if (!gatewayAccountId) { toast({ title: "Select a gateway account first", variant: "destructive" }); return; }
    if (!rows.length) { toast({ title: "Nothing to import", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const summary = await importRows(rows, gatewayAccountId, categories, plans);
      toast({ title: "Import complete", description: `${summary.created_customers} customers, ${summary.created_subs} new + ${summary.updated_subs} updated subscriptions` });
      onClose();
    } catch (err) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-800 text-zinc-100 max-w-2xl">
        <DialogHeader><DialogTitle>Import Subscriptions (CSV)</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-slate-500">Columns: customer_name, customer_email, raw_product_name, amount, currency, billing_interval, status, external_subscription_id, next_billing_date. Products are auto-classified by your category rules.</p>
          <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="bg-slate-900 border-slate-700 text-zinc-100" />
          {rows.length > 0 && (
            <div className="text-xs text-slate-400 border border-slate-800 rounded-lg p-3 max-h-48 overflow-y-auto">
              <p className="text-zinc-300 mb-1">{rows.length} rows ready</p>
              <pre className="whitespace-pre-wrap text-slate-500">{rows.slice(0, 3).map((r) => r.raw_product_name || r.product_name || "(no name)").join("\n")}{rows.length > 3 ? `\n...+${rows.length - 3} more` : ""}</pre>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-zinc-300 hover:bg-slate-800">Cancel</Button>
          <Button onClick={handleImport} disabled={busy || !rows.length} className="bg-cyan-600 hover:bg-cyan-700 text-white">{busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Import {rows.length} rows</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}