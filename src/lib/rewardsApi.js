import { base44 } from "@/api/base44Client";

// Generate a unique referral code from the user's name
export function generateReferralCode(user) {
  const name = (user.full_name || user.email || "USER")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 6) || "USER";
  const num = Math.floor(100 + Math.random() * 900);
  return `STREAM-${name}-${num}`;
}

export function generateReferralLink(code) {
  return `${window.location.origin}/join?ref=${code}`;
}

// Get-or-create helpers
export async function getOrCreateReferralProgram(user) {
  const existing = await base44.entities.ReferralProgram.filter({ user_id: user.id });
  if (existing[0]) return existing[0];
  const code = generateReferralCode(user);
  return base44.entities.ReferralProgram.create({
    user_id: user.id,
    referral_code: code,
    referral_link: generateReferralLink(code),
  });
}

export async function getOrCreateWallet(user) {
  const existing = await base44.entities.UserBillingCredit.filter({ user_id: user.id });
  if (existing[0]) return existing[0];
  return base44.entities.UserBillingCredit.create({ user_id: user.id });
}

export async function getOrCreateCommunityProfile(user) {
  const existing = await base44.entities.UserCommunityProfile.filter({ user_id: user.id });
  if (existing[0]) return existing[0];
  return base44.entities.UserCommunityProfile.create({ user_id: user.id });
}

// Determine current tier based on active months and successful referrals
export function calculateUserTier(activeMonths, successfulReferrals, tiers) {
  const sorted = [...tiers].sort((a, b) => (a.tier_rank || 0) - (b.tier_rank || 0));
  let current = sorted[0];
  for (const tier of sorted) {
    if (activeMonths >= (tier.min_active_months || 0) && successfulReferrals >= (tier.min_successful_referrals || 0)) {
      current = tier;
    }
  }
  return current;
}

export function getNextTier(currentTier, tiers) {
  const sorted = [...tiers].sort((a, b) => (a.tier_rank || 0) - (b.tier_rank || 0));
  const idx = sorted.findIndex((t) => t.id === currentTier?.id);
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
}

// Calculate progress percentage to next tier
export function calculateProgress(nextTier, activeMonths, referrals) {
  if (!nextTier) return 100;
  const monthsTarget = nextTier.min_active_months || 1;
  const refsTarget = nextTier.min_successful_referrals || 1;
  const monthsPct = Math.min(100, (activeMonths / monthsTarget) * 100);
  const refsPct = Math.min(100, (referrals / refsTarget) * 100);
  return Math.floor(Math.min(monthsPct, refsPct));
}

// Obfuscate email for display (e.g. j***@domain.com)
export function obfuscateEmail(email) {
  if (!email) return "N/A";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 1)}***@${domain}`;
}

export function formatCurrency(amount) {
  return `$${(amount || 0).toFixed(2)} USD`;
}

// Calculate active months from a signup date
export function calculateActiveMonths(signupDate) {
  if (!signupDate) return 0;
  const start = new Date(signupDate);
  const now = new Date();
  return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24 * 30)));
}