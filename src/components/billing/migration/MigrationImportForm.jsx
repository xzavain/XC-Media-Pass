import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";
import { parseStripeSubscriptions, parsePaypalSubscriptions, ingestMigrationBatch, generateBatchId } from "@/lib/migrationApi";
import { useAuth } from "@/lib/AuthContext";

const PARSERS = {
  stripe: parseStripeSubscriptions,
  paypal: parsePaypalSubscriptions,
};

const SOURCE_LABELS = { stripe: "Stripe", paypal: "PayPal" };

export default function MigrationImportForm({ source, open, onOpenChange, onImported }) {
  const [rawData, setRawData] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [result, setResult] = useState(null);
  const { user } = useAuth();

  const handleParse = () => {
    setError("");
    setResult(null);
    try {
      const parser = PARSERS[source];
      const rows = parser(rawData);
      setPreview(rows);
    } catch (e) {
      setError(e.message);
      setPreview(null);
    }
  };

  const handleIngest = async () => {
    if (!preview || preview.length === 0) return;
    setIngesting(true);
    setError("");
    try {
      const batchId = generateBatchId();
      await ingestMigrationBatch(preview, { name: user?.full_name || user?.email, email: user?.email }, batchId);
      setResult({ count: preview.length, batchId });
      setRawData("");
      setPreview(null);
      onImported?.();
    } catch (e) {
      setError(e.message || "Ingestion failed");
    } finally {
      setIngesting(false);
    }
  };

  const handleClose = (v) => {
    if (!v) {
      setRawData("");
      setPreview(null);
      setError("");
      setResult(null);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from {SOURCE_LABELS[source]}</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-lime-500/30 bg-lime-500/5 p-3 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-lime-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-400">
            <span className="text-lime-400 font-medium">Read-only import.</span> Pasting data here only copies it into the local database.
            It does not connect to or modify anything on your live {SOURCE_LABELS[source]} account — subscriptions, customers, and billing remain untouched.
          </p>
        </div>

        {result ? (
          <div className="py-6 text-center">
            <CheckCircle className="w-10 h-10 text-lime-400 mx-auto mb-3" />
            <p className="text-zinc-100 font-medium">{result.count} records staged for migration</p>
            <p className="text-xs text-zinc-500 mt-1">Batch ID: {result.batchId}</p>
            <p className="text-xs text-zinc-500 mt-2">No welcome emails were sent — records are silently imported and pending activation.</p>
            <Button className="mt-4 bg-lime-600 hover:bg-lime-700 text-white" onClick={() => handleClose(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-zinc-400">Paste {SOURCE_LABELS[source]} API response (JSON array or API wrapper)</Label>
              <Textarea
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                placeholder={`Paste the JSON response from the ${SOURCE_LABELS[source]} API here...`}
                className="bg-zinc-950/50 border-zinc-700 text-zinc-100 font-mono text-xs min-h-[180px]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            {preview && preview.length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 max-h-48 overflow-y-auto">
                <p className="text-xs text-zinc-400 mb-2">{preview.length} records parsed — preview:</p>
                <div className="space-y-1">
                  {preview.slice(0, 5).map((r, i) => (
                    <div key={i} className="text-xs text-zinc-300 flex items-center gap-2">
                      <span className="text-zinc-600">#{i + 1}</span>
                      <span className="truncate">{r.customer_name || r.customer_email}</span>
                      <span className="text-zinc-500">${r.original_price}/{r.billing_cycle}</span>
                    </div>
                  ))}
                  {preview.length > 5 && <p className="text-xs text-zinc-500">...and {preview.length - 5} more</p>}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" className="border-zinc-700" onClick={() => handleClose(false)}>Cancel</Button>
              <Button variant="outline" className="border-zinc-700" disabled={!rawData || ingesting} onClick={handleParse}>
                Parse Preview
              </Button>
              <Button
                className="bg-lime-600 hover:bg-lime-700 text-white"
                disabled={!preview || preview.length === 0 || ingesting}
                onClick={handleIngest}
              >
                {ingesting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Stage ${preview?.length || 0} Records`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}