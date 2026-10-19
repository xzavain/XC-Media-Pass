import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileText, Loader2 } from "lucide-react";
import { customersToCsv, customersTemplateCsv, parseCustomersCsv, downloadCsv } from "@/lib/customerCsv";

export default function CustomerImportExport({ customers, plans, onImported }) {
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleExport = () => {
    downloadCsv("billing-customers.csv", customersToCsv(customers, plans));
  };

  const handleTemplate = () => {
    downloadCsv("billing-customers-template.csv", customersTemplateCsv(plans));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const text = await file.text();
      const { rows, errors } = parseCustomersCsv(text, plans);

      const existingByEmail = Object.fromEntries(
        customers.map((c) => [c.email.trim().toLowerCase(), c])
      );

      const toCreate = [];
      const toUpdate = [];
      rows.forEach((row) => {
        const existing = existingByEmail[row.email.trim().toLowerCase()];
        if (existing) toUpdate.push({ id: existing.id, ...row });
        else toCreate.push(row);
      });

      if (toCreate.length > 0) await base44.entities.BillingCustomer.bulkCreate(toCreate);
      if (toUpdate.length > 0) await base44.entities.BillingCustomer.bulkUpdate(toUpdate);

      setResult({ created: toCreate.length, updated: toUpdate.length, errors });
      onImported();
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="border-zinc-700 gap-1.5" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
        <Button variant="outline" size="sm" className="border-zinc-700 gap-1.5" onClick={handleTemplate}>
          <FileText className="w-3.5 h-3.5" /> Download Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-700 gap-1.5"
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
        >
          {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Import CSV
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
      </div>
      {result && (
        <p className="text-xs text-zinc-500">
          Imported: {result.created} created, {result.updated} updated.
          {result.errors.length > 0 && (
            <span className="text-red-400"> {result.errors.length} row(s) skipped — {result.errors.join("; ")}</span>
          )}
        </p>
      )}
    </div>
  );
}