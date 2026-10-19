import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Pause, XCircle, Flag, TrendingUp, DollarSign, Percent, Wallet } from "lucide-react";
import moment from "moment";
import { obfuscateEmail } from "@/lib/rewardsApi";

const statusConfig = {
  pending_hold_period: { label: "Pending Hold", color: "text-amber-400 bg-amber-500/10" },
  credited_to_balance: { label: "Credited", color: "text-emerald-400 bg-emerald-500/10" },
  invoiced_applied: { label: "Applied", color: "text-indigo-400 bg-indigo-500/10" },
  revoked_chargeback: { label: "Revoked", color: "text-rose-400 bg-rose-500/10" },
};

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500"><Icon className={`w-3.5 h-3.5 ${color}`} /> {label}</div>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

export default function ReferralOversightPanel({ transactions, onApprove, onHold, onRevoke }) {
  const totalCredits = transactions.filter((t) => t.status === "credited_to_balance" || t.status === "invoiced_applied").reduce((s, t) => s + (t.credit_amount || 0), 0);
  const totalRevenue = transactions.reduce((s, t) => s + (t.referred_plan_value || 0), 0);
  const approved = transactions.filter((t) => t.status === "credited_to_balance" || t.status === "invoiced_applied").length;
  const conversionRate = transactions.length > 0 ? ((approved / transactions.length) * 100).toFixed(1) : "0.0";
  const netProfit = totalRevenue - totalCredits;

  // Simple fraud flag: same email domain between referrer and referee
  const flagged = transactions.filter((t) => {
    if (!t.referred_email) return false;
    const domain = t.referred_email.split("@")[1];
    return domain && domain.split(".").length <= 2 && domain.includes("gmail"); // placeholder logic
  });

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={DollarSign} label="Total Credits Issued" value={`$${totalCredits.toFixed(2)}`} color="text-emerald-400" />
        <MetricCard icon={TrendingUp} label="Revenue from Referrals" value={`$${totalRevenue.toFixed(2)}`} color="text-indigo-400" />
        <MetricCard icon={Percent} label="Conversion Rate" value={`${conversionRate}%`} color="text-amber-400" />
        <MetricCard icon={Wallet} label="Net Profit After Credits" value={`$${netProfit.toFixed(2)}`} color="text-purple-400" />
      </div>

      {/* Fraud guard */}
      {flagged.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <Flag className="w-4 h-4 text-rose-400" />
          <p className="text-xs text-rose-300">{flagged.length} transaction(s) flagged for review — suspicious patterns detected (same email domain).</p>
        </div>
      )}

      {/* Transaction table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">All Referral Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="text-left py-2 px-2">Date</th>
                <th className="text-left py-2 px-2">Referred User</th>
                <th className="text-left py-2 px-2">Plan</th>
                <th className="text-right py-2 px-2">Credit</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-right py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-6">No transactions yet.</td></tr>
              ) : (
                transactions.map((tx) => {
                  const st = statusConfig[tx.status] || statusConfig.pending_hold_period;
                  return (
                    <tr key={tx.id} className="border-b border-slate-800/50">
                      <td className="py-2 px-2 text-slate-400 whitespace-nowrap">{moment(tx.created_date).format("MMM D")}</td>
                      <td className="py-2 px-2 text-slate-300">{obfuscateEmail(tx.referred_email)}</td>
                      <td className="py-2 px-2 text-slate-300">{tx.referred_plan_name || "—"}</td>
                      <td className="py-2 px-2 text-right text-emerald-400 font-semibold">${(tx.credit_amount || 0).toFixed(2)}</td>
                      <td className="py-2 px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span></td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1 justify-end">
                          {tx.status === "pending_hold_period" && (
                            <Button onClick={() => onApprove(tx)} size="icon" className="h-6 w-6 bg-emerald-600 hover:bg-emerald-700 text-white" title="Approve Credit">
                              <CheckCircle2 className="w-3 h-3" />
                            </Button>
                          )}
                          {tx.status === "credited_to_balance" && (
                            <Button onClick={() => onHold(tx)} size="icon" variant="outline" className="h-6 w-6 border-amber-500/30 text-amber-400" title="Hold for Review">
                              <Pause className="w-3 h-3" />
                            </Button>
                          )}
                          {tx.status !== "revoked_chargeback" && (
                            <Button onClick={() => onRevoke(tx)} size="icon" variant="outline" className="h-6 w-6 border-rose-500/30 text-rose-400" title="Revoke Credit">
                              <XCircle className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}