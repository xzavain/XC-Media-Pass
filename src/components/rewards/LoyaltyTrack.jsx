import React from "react";
import { Check, Lock, Star } from "lucide-react";
import { getNextTier, calculateProgress } from "@/lib/rewardsApi";

export default function LoyaltyTrack({ tiers, currentTier, activeMonths, successfulReferrals }) {
  const sorted = [...tiers].sort((a, b) => (a.tier_rank || 0) - (b.tier_rank || 0));
  const nextTier = getNextTier(currentTier, tiers);
  const progress = calculateProgress(nextTier, activeMonths, successfulReferrals);
  const monthsNeeded = nextTier ? Math.max(0, nextTier.min_active_months - activeMonths) : 0;
  const refsNeeded = nextTier ? Math.max(0, nextTier.min_successful_referrals - successfulReferrals) : 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">VIP Loyalty Track</h3>

      {/* Tier roadmap */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {sorted.map((tier, i) => {
          const isCurrent = tier.id === currentTier?.id;
          const isUnlocked = (tier.tier_rank || 0) <= (currentTier?.tier_rank || 0);
          return (
            <div key={tier.id} className="flex items-center gap-2 flex-shrink-0">
              <div className={`px-3 py-2 rounded-lg border min-w-28 ${isCurrent ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : isUnlocked ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-800 bg-slate-900/40"}`}>
                <div className="flex items-center gap-1.5">
                  {isUnlocked ? <Check className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-slate-600" />}
                  <p className={`text-sm font-bold ${isCurrent ? "text-indigo-400" : isUnlocked ? "text-emerald-400" : "text-slate-400"}`}>{tier.tier_name}</p>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{tier.min_active_months}mo · {tier.min_successful_referrals} refs</p>
              </div>
              {i < sorted.length - 1 && <div className={`w-6 h-px ${isUnlocked ? "bg-emerald-500/40" : "bg-slate-700"}`} />}
            </div>
          );
        })}
      </div>

      {/* Progress tracker */}
      {nextTier ? (
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-300">
              {refsNeeded > 0 && `${refsNeeded} more referral${refsNeeded > 1 ? "s" : ""}`}
              {refsNeeded > 0 && monthsNeeded > 0 && " and "}
              {monthsNeeded > 0 && `${monthsNeeded} more month${monthsNeeded > 1 ? "s" : ""}`}
              {!refsNeeded && !monthsNeeded && "Ready to advance!"}
              <span className="text-slate-500"> to unlock <span className="text-indigo-400 font-semibold">{nextTier.tier_name}</span></span>
            </p>
            <span className="text-sm font-bold text-indigo-400">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
          <Star className="w-4 h-4 text-purple-400" />
          <p className="text-sm text-purple-300">You've reached the highest tier — Obsidian VIP! Maximum perks unlocked.</p>
        </div>
      )}

      {/* Current tier perks */}
      {currentTier?.perk_summary && (
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
          <p className="text-xs text-slate-500 mb-1">Your Current Perks:</p>
          <p className="text-sm text-slate-300">{currentTier.perk_summary}</p>
        </div>
      )}
    </div>
  );
}