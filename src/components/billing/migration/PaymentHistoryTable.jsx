import React, { useState, useMemo } from "react";
import { Upload, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parsePaymentLogsCsv, ingestPaymentLogs } from "@/lib/migrationApi";

const STATUS_STYLES = {
  success: "bg-lime-500/10 text-lime-400",
  failed: "bg-red-500/10 text-red-400",
  refunded: "bg-amber-500/10 text-amber-400",
  pending: "bg-blue-500/10 text-blue-400",
  disputed: "bg-orange-500/10 text-orange-400",
};

export default function PaymentHistoryTable({ payments, onImported }) {
  const [rawCsv, setRawCsv] = useState("");
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState("all");

  const handleParse = () => {
    setError("");
    setResult(null);
    try {
      const rows = parsePaymentLogsCsv(rawCsv);
      setParsed(rows);
      if (rows.length === 0) setError("No rows found in CSV");
    } catch (e) {
      setError(e.message);
      setParsed(null);
    }
  };

  const handleIngest = async () => {
    if (!parsed || parsed.length === 0) return;
    setIngesting(true);
    try {
      await ingestPaymentLogs(parsed);
      setResult({ count: parsed.length });
      setRawCsv("");
      setParsed(null);
      onImported?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setIngesting(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return payments;
    return payments.filter((p) => p.status === filter);
  }, [payments, filter]);

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 space-y-3">
        <div>
          <Label className="text-xs text-zinc-400">Ingest historical payment logs (CSV: email, processor, amount, status, transaction_id, payment_date, failure_reason)</Label>
          <Textarea
            value={rawCsv}
            onChange={(e) => setRawCsv(e.target.value)}
            placeholder={"email,processor,amount,status,transaction_id,payment_date,failure_reason\njohn@example.com,stripe,9.99,success,ch_xxx,2025-01-15,"}
            className="bg-zinc-950/50 border-zinc-700 text-zinc-100 font-mono text-xs min-h-[100px]"
          />
        </div>
        {error && <div className="flex items-center gap-2 text-sm text-red-400"><AlertCircle className="w-4 h-4" /> {error}</div>}
        {result && <div className="flex items-center gap-2 text-sm text-lime-400"><CheckCircle className="w-4 h-4" /> {result.count} payment records imported</div>}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-zinc-700" disabled={!rawCsv} onClick={handleParse}>Parse</Button>
          <Button size="sm" className="bg-lime-600 hover:bg-lime-700 text-white" disabled={!parsed || ingesting} onClick={handleIngest}>
            {ingesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Ingest {parsed?.length || 0} Records
          </Button>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800/60 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-200">Payment History</h3>
          <span className="text-xs text-zinc-500">{filtered.length} of {payments.length} records</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-32 text-xs bg-zinc-950/50 ml-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950/40 border-b border-zinc-800/60 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Customer</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Processor</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Amount</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Status</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Transaction</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Date</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-400 uppercase">Failure Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-zinc-500">No payment records</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/30">
                    <td className="px-3 py-2">
                      <p className="text-zinc-200 truncate max-w-[140px]">{p.customer_name || "—"}</p>
                      <p className="text-xs text-zinc-500 truncate max-w-[140px]">{p.customer_email}</p>
                    </td>
                    <td className="px-3 py-2 text-zinc-300 capitalize">{p.processor}</td>
                    <td className="px-3 py-2 text-zinc-200">${p.amount?.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status] || "bg-zinc-700 text-zinc-300"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-400 font-mono text-xs truncate max-w-[120px]">{p.transaction_id || "—"}</td>
                    <td className="px-3 py-2 text-zinc-400 text-xs">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2 text-red-400 text-xs truncate max-w-[160px]">{p.failure_reason || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}