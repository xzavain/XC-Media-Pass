import React from "react";
import { CreditCard, Wallet, ArrowRight } from "lucide-react";

const SOURCE_CONFIG = {
  stripe: {
    icon: CreditCard,
    label: "Stripe",
    description: "Migrate active recurring subscriptions & payment history from Stripe",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    fields: ["Secret Key", "Publishable Key"],
  },
  paypal: {
    icon: Wallet,
    label: "PayPal",
    description: "Map recurring PayPal subscriptions into the local database without re-subscribe",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
    fields: ["Client ID", "Client Secret", "Webhook ID"],
  },
};

export default function MigrationSourceCard({ source, migrationCount, onImport }) {
  const config = SOURCE_CONFIG[source];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border p-5 ${config.bg}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-900/60 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-zinc-100">{config.label} Migration</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{config.description}</p>
        </div>
      </div>
      <div className="space-y-1.5 mb-4">
        {config.fields.map((f) => (
          <div key={f} className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" /> {f}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {migrationCount > 0 ? `${migrationCount} records imported` : "No imports yet"}
        </span>
        <button
          onClick={() => onImport(source)}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-200 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 transition-colors"
        >
          Import Data <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}