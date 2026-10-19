import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trophy, Webhook, List } from "lucide-react";
import ReferralOversightPanel from "@/components/rewards/admin/ReferralOversightPanel";
import TierRoleMapper from "@/components/rewards/admin/TierRoleMapper";

export default function AdminRewards() {
  const [transactions, setTransactions] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [txList, tierList] = await Promise.all([
      base44.entities.ReferralTransaction.list("-created_date", 200),
      base44.entities.LoyaltyTier.list("tier_rank", 50),
    ]);
    setTransactions(txList);
    setTiers(tierList);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleApprove = async (tx) => {
    await base44.entities.ReferralTransaction.update(tx.id, { status: "credited_to_balance" });
    // Add credit to referrer's wallet
    const wallets = await base44.entities.UserBillingCredit.filter({ user_id: tx.referrer_user_id });
    if (wallets[0]) {
      await base44.entities.UserBillingCredit.update(wallets[0].id, {
        current_wallet_balance: (wallets[0].current_wallet_balance || 0) + (tx.credit_amount || 0),
      });
    }
    // Update referral program stats
    const programs = await base44.entities.ReferralProgram.filter({ user_id: tx.referrer_user_id });
    if (programs[0]) {
      await base44.entities.ReferralProgram.update(programs[0].id, {
        total_credit_earned: (programs[0].total_credit_earned || 0) + (tx.credit_amount || 0),
        pending_credit_balance: Math.max(0, (programs[0].pending_credit_balance || 0) - (tx.credit_amount || 0)),
      });
    }
    loadAll();
  };

  const handleHold = async (tx) => {
    await base44.entities.ReferralTransaction.update(tx.id, { status: "pending_hold_period" });
    loadAll();
  };

  const handleRevoke = async (tx) => {
    await base44.entities.ReferralTransaction.update(tx.id, { status: "revoked_chargeback" });
    // Remove credit from referrer's wallet if it was previously credited
    if (tx.status === "credited_to_balance" || tx.status === "invoiced_applied") {
      const wallets = await base44.entities.UserBillingCredit.filter({ user_id: tx.referrer_user_id });
      if (wallets[0]) {
        await base44.entities.UserBillingCredit.update(wallets[0].id, {
          current_wallet_balance: Math.max(0, (wallets[0].current_wallet_balance || 0) - (tx.credit_amount || 0)),
        });
      }
    }
    loadAll();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" /> Rewards & Loyalty Engine
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage referral credits, fraud review, VIP tiers, and Discord role automation</p>
      </div>

      <Tabs defaultValue="oversight">
        <TabsList className="bg-slate-900/60 border border-slate-800">
          <TabsTrigger value="oversight" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400 gap-1.5">
            <List className="w-3.5 h-3.5" /> Referral Oversight ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="tiers" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400 gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> VIP Tiers & Discord Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="oversight" className="mt-4">
          <ReferralOversightPanel transactions={transactions} onApprove={handleApprove} onHold={handleHold} onRevoke={handleRevoke} />
        </TabsContent>

        <TabsContent value="tiers" className="mt-4">
          <TierRoleMapper tiers={tiers} onSaved={loadAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}