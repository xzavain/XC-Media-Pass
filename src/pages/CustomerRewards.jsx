import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Trophy } from "lucide-react";
import WalletBalanceDeck from "@/components/rewards/WalletBalanceDeck";
import HowItWorksCard from "@/components/rewards/HowItWorksCard";
import LoyaltyTrack from "@/components/rewards/LoyaltyTrack";
import DiscordConnectTile from "@/components/rewards/DiscordConnectTile";
import ReferralLedgerTable from "@/components/rewards/ReferralLedgerTable";
import { getOrCreateReferralProgram, getOrCreateWallet, getOrCreateCommunityProfile, calculateUserTier, calculateActiveMonths } from "@/lib/rewardsApi";

export default function CustomerRewards() {
  const { user } = useAuth();
  const [referralProgram, setReferralProgram] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [communityProfile, setCommunityProfile] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [billingCustomer, setBillingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [rp, wl, cp, tierList, txList, bcList] = await Promise.all([
      getOrCreateReferralProgram(user),
      getOrCreateWallet(user),
      getOrCreateCommunityProfile(user),
      base44.entities.LoyaltyTier.list("tier_rank", 50),
      base44.entities.ReferralTransaction.filter({ referrer_user_id: user.id }, "-created_date", 50),
      base44.entities.BillingCustomer.filter({ email: user.email }),
    ]);
    setReferralProgram(rp);
    setWallet(wl);
    setCommunityProfile(cp);
    setTiers(tierList);
    setTransactions(txList);
    setBillingCustomer(bcList[0] || null);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const activeMonths = calculateActiveMonths(billingCustomer?.original_signup_date || billingCustomer?.created_date);
  const successfulReferrals = transactions.filter((t) => t.status === "credited_to_balance" || t.status === "invoiced_applied").length;
  const currentTier = calculateUserTier(activeMonths, successfulReferrals, tiers);

  const handleLinkDiscord = async (discordId, discordUsername) => {
    const updated = await base44.entities.UserCommunityProfile.update(communityProfile.id, {
      discord_user_id: discordId,
      discord_username: discordUsername,
      is_discord_synced: true,
      current_tier_id: currentTier?.id || null,
    });
    setCommunityProfile(updated);
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      const updated = await base44.entities.UserCommunityProfile.update(communityProfile.id, {
        is_discord_synced: true,
        current_tier_id: currentTier?.id || null,
      });
      setCommunityProfile(updated);
    } finally { setSyncing(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" /> Loyalty Tiers & Referral Hub
        </h1>
        <p className="text-sm text-slate-500 mt-1">Earn invoice credit, climb VIP tiers, and sync your Discord roles</p>
      </div>

      <WalletBalanceDeck wallet={wallet} referralProgram={referralProgram} currentTier={currentTier} communityProfile={communityProfile} />

      <HowItWorksCard />

      <LoyaltyTrack tiers={tiers} currentTier={currentTier} activeMonths={activeMonths} successfulReferrals={successfulReferrals} />

      <DiscordConnectTile communityProfile={communityProfile} currentTier={currentTier} onProfileUpdate={setCommunityProfile} />

      <ReferralLedgerTable transactions={transactions} />
    </div>
  );
}