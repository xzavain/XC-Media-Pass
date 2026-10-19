import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Bot, Server } from "lucide-react";

export default function TierRoleMapper({ tiers, onSaved }) {
  const [botToken, setBotToken] = useState("");
  const [guildId, setGuildId] = useState("");
  const [savingBot, setSavingBot] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingTier, setSavingTier] = useState(null);

  // Load bot settings from the first tier (rank 0)
  const firstTier = [...tiers].sort((a, b) => (a.tier_rank || 0) - (b.tier_rank || 0))[0];

  const handleSaveBot = async () => {
    if (!firstTier) return;
    setSavingBot(true);
    try {
      await base44.entities.LoyaltyTier.update(firstTier.id, { discord_bot_token: botToken, discord_guild_id: guildId });
      onSaved?.();
    } finally { setSavingBot(false); }
  };

  const handleEdit = (tier) => {
    setEditingTier(tier.id);
    setEditForm({
      tier_name: tier.tier_name,
      min_active_months: tier.min_active_months || 0,
      min_successful_referrals: tier.min_successful_referrals || 0,
      perk_summary: tier.perk_summary || "",
      discord_role_id: tier.discord_role_id || "",
      discord_role_name: tier.discord_role_name || "",
    });
  };

  const handleSaveTier = async (tier) => {
    setSavingTier(tier.id);
    try {
      await base44.entities.LoyaltyTier.update(tier.id, editForm);
      setEditingTier(null);
      onSaved?.();
    } finally { setSavingTier(null); }
  };

  const sorted = [...tiers].sort((a, b) => (a.tier_rank || 0) - (b.tier_rank || 0));

  return (
    <div className="space-y-4">
      {/* Discord Bot Integration */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Bot className="w-4 h-4 text-indigo-400" /> Discord Bot Integration</h3>
        <p className="text-xs text-slate-500">Configure the bot token and guild ID for automated role sync. Stored globally on the rank-0 tier.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 flex items-center gap-1"><Bot className="w-3 h-3" /> Bot Token</label>
            <Input type="password" placeholder="Discord Bot Token" value={botToken} onChange={(e) => setBotToken(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100" />
          </div>
          <div>
            <label className="text-xs text-slate-500 flex items-center gap-1"><Server className="w-3 h-3" /> Guild (Server) ID</label>
            <Input placeholder="Discord Guild ID" value={guildId} onChange={(e) => setGuildId(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100" />
          </div>
        </div>
        <Button onClick={handleSaveBot} disabled={savingBot} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-sm">
          {savingBot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Bot Settings
        </Button>
        {firstTier?.discord_bot_token && <p className="text-xs text-emerald-400">✓ Bot token configured</p>}
      </div>

      {/* Tier Editor */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">VIP Tier & Discord Role Mapping</h3>
        {sorted.map((tier) => (
          <div key={tier.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            {editingTier === tier.id ? (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Tier Name</label>
                    <Input value={editForm.tier_name} onChange={(e) => setEditForm((f) => ({ ...f, tier_name: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Discord Role Name</label>
                    <Input placeholder="@Gold Cinephile" value={editForm.discord_role_name} onChange={(e) => setEditForm((f) => ({ ...f, discord_role_name: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Min Active Months</label>
                    <Input type="number" value={editForm.min_active_months} onChange={(e) => setEditForm((f) => ({ ...f, min_active_months: Number(e.target.value) }))} className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Min Successful Referrals</label>
                    <Input type="number" value={editForm.min_successful_referrals} onChange={(e) => setEditForm((f) => ({ ...f, min_successful_referrals: Number(e.target.value) }))} className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Discord Role ID</label>
                  <Input placeholder="1234567890123456789" value={editForm.discord_role_id} onChange={(e) => setEditForm((f) => ({ ...f, discord_role_id: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Perk Summary</label>
                  <Input placeholder="Priority transcode queues, beta access..." value={editForm.perk_summary} onChange={(e) => setEditForm((f) => ({ ...f, perk_summary: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleSaveTier(tier)} disabled={savingTier === tier.id} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 gap-1">
                    {savingTier === tier.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                  </Button>
                  <Button onClick={() => setEditingTier(null)} variant="outline" className="border-slate-700 text-slate-300 text-xs h-7">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold px-3 py-1 rounded-lg text-white" style={{ background: tier.gradient_colors || "linear-gradient(135deg, #b45309, #78350f)" }}>
                    {tier.tier_name}
                  </span>
                  <div className="text-xs text-slate-500">
                    <p>{tier.min_active_months}mo · {tier.min_successful_referrals} refs</p>
                    {tier.discord_role_name && <p className="text-indigo-400">{tier.discord_role_name}</p>}
                  </div>
                </div>
                <Button onClick={() => handleEdit(tier)} variant="outline" className="border-slate-700 text-slate-300 text-xs h-7">Edit</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}