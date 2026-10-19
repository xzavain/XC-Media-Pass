import React from "react";
import moment from "moment";
import { obfuscateEmail } from "@/lib/rewardsApi";

const statusConfig = {
  pending_hold_period: { label: "Pending Hold", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  credited_to_balance: { label: "Ready", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  invoiced_applied: { label: "Applied to Invoice", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  revoked_chargeback: { label: "Revoked", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

export default function ReferralLedgerTable({ transactions }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Referral & Ledger Activity</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-800">
              <th className="text-left py-2 px-2 font-medium">Date</th>
              <th className="text-left py-2 px-2 font-medium">Referred User</th>
              <th className="text-left py-2 px-2 font-medium">Plan Selected</th>
              <th className="text-right py-2 px-2 font-medium">Credit Amount</th>
              <th className="text-left py-2 px-2 font-medium">Status</th>
              <th className="text-left py-2 px-2 font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-slate-500 py-8">No referral transactions yet. Share your link to start earning credit!</td></tr>
            ) : (
              transactions.map((tx) => {
                const st = statusConfig[tx.status] || statusConfig.pending_hold_period;
                return (
                  <tr key={tx.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="py-2.5 px-2 text-slate-400 whitespace-nowrap">{moment(tx.created_date).format("MMM D, YYYY")}</td>
                    <td className="py-2.5 px-2 text-slate-300">{obfuscateEmail(tx.referred_email)}</td>
                    <td className="py-2.5 px-2 text-slate-300">{tx.referred_plan_name || "—"}</td>
                    <td className="py-2.5 px-2 text-right text-emerald-400 font-semibold">${(tx.credit_amount || 0).toFixed(2)}</td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>
                        {tx.invoice_number ? `${st.label} #${tx.invoice_number}` : st.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 font-mono text-xs">#{tx.id.slice(-8).toUpperCase()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}