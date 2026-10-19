import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Database, Loader2, ShieldCheck, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MigrationSourceCard from "@/components/billing/migration/MigrationSourceCard";
import MigrationImportForm from "@/components/billing/migration/MigrationImportForm";
import MigrationStatusTable from "@/components/billing/migration/MigrationStatusTable";
import PaymentHistoryTable from "@/components/billing/migration/PaymentHistoryTable";

export default function MigrationPipeline() {
  const [migrations, setMigrations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importSource, setImportSource] = useState(null);

  const loadAll = useCallback(async () => {
    const [m, p, pl] = await Promise.all([
      base44.entities.SubscriptionMigration.list("-migrated_at", 500),
      base44.entities.PaymentHistory.list("-payment_date", 500),
      base44.entities.StorePlan.list(),
    ]);
    setMigrations(m);
    setPayments(p);
    setPlans(pl);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const counts = migrations.reduce((acc, m) => { acc[m.source] = (acc[m.source] || 0) + 1; return acc; }, {});

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <Link to="/billing" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft className="w-3 h-3" /> Billing Engine
      </Link>
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
          <Database className="w-6 h-6 text-lime-400" /> Migration Pipeline
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Import subscriptions from Stripe & PayPal — silent staged ingestion with no automatic emails</p>
      </div>

      <div className="rounded-xl border border-lime-500/30 bg-lime-500/5 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-lime-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-lime-400">Read-Only Import — Your External Systems Are Safe</p>
          <p className="text-xs text-zinc-400 mt-1">
            This pipeline only <span className="text-zinc-200">reads</span> data you paste from Stripe and PayPal and copies it into the local database.
            It never connects to, writes to, modifies, or cancels anything on your live Stripe or PayPal accounts.
            Active subscriptions, customer accounts, and billing cycles on those platforms remain completely untouched.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400"><Lock className="w-3 h-3 text-lime-400" /> No outbound API calls to external systems</span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-400"><Lock className="w-3 h-3 text-lime-400" /> No subscription cancellations or modifications</span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-400"><Lock className="w-3 h-3 text-lime-400" /> No emails sent during import</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-lime-400" /></div>
      ) : (
        <Tabs defaultValue="import">
          <TabsList className="bg-zinc-900/60 border border-zinc-800/60">
            <TabsTrigger value="import">Import Sources</TabsTrigger>
            <TabsTrigger value="queue">Migration Queue ({migrations.length})</TabsTrigger>
            <TabsTrigger value="payments">Payment History ({payments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <MigrationSourceCard source="stripe" migrationCount={counts.stripe || 0} onImport={() => setImportSource("stripe")} />
              <MigrationSourceCard source="paypal" migrationCount={counts.paypal || 0} onImport={() => setImportSource("paypal")} />
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">How Migration Works</h3>
              <ol className="text-sm text-zinc-400 space-y-1.5 list-decimal list-inside">
                <li>Export or copy the JSON response from the source platform's API (Stripe or PayPal) — this is a read-only operation on their end</li>
                <li>Paste that JSON into the import dialog here — it is parsed locally and staged as <span className="text-amber-400">pending</span> migrations. No emails are sent, no external accounts are touched</li>
                <li>Map each pending migration to a local StorePlan and activate it — this only creates or updates a record in <span className="text-zinc-200">this platform's database</span>, never on the source platform</li>
                <li>Ingest historical payment logs separately via CSV to preserve full transaction history — again, local only</li>
              </ol>
              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center gap-2 text-xs text-lime-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Your Stripe and PayPal accounts are never modified, written to, or contacted by this pipeline.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="queue" className="mt-4">
            <MigrationStatusTable migrations={migrations} plans={plans} onActivated={loadAll} />
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <PaymentHistoryTable payments={payments} onImported={loadAll} />
          </TabsContent>
        </Tabs>
      )}

      <MigrationImportForm
        source={importSource}
        open={!!importSource}
        onOpenChange={(v) => !v && setImportSource(null)}
        onImported={loadAll}
      />
    </div>
  );
}