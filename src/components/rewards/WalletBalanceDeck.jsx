import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, QrCode, Send, MessageCircle, Twitter, Gift } from "lucide-react";

export default function WalletBalanceDeck({ wallet, referralProgram, currentTier, communityProfile }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const link = referralProgram?.referral_link || "";
  const shareText = "Join me on MediaEdge — get premium streaming with Plex, Emby & Jellyfin!";

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrls = {
    telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + " " + link)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(link)}`,
  };

  return (
    <div className="space-y-4">
      {/* Top metrics grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Available Invoice Credit */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <p className="text-xs text-slate-500 flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Available Invoice Credit</p>
            <p className="text-4xl lg:text-5xl font-bold text-emerald-400 mt-1 font-mono">
              ${(wallet?.current_wallet_balance || 0).toFixed(2)} <span className="text-lg text-slate-500">USD</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">Will automatically cover your next bill on your next renewal date</p>
          </div>
        </div>

        {/* Lifetime Referrals + VIP Tier */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs text-slate-500">Lifetime Referrals</p>
            <p className="text-2xl font-bold text-white mt-0.5">{referralProgram?.total_referred_users || 0} <span className="text-sm text-slate-500">Active</span></p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs text-slate-500">VIP Tier</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-sm font-bold px-3 py-1 rounded-lg text-white"
                style={{ background: currentTier?.gradient_colors || "linear-gradient(135deg, #b45309, #78350f)" }}
              >
                {currentTier?.tier_name || "Bronze Pioneer"}
              </span>
            </div>
            <p className="text-xs mt-2">
              {communityProfile?.is_discord_synced ? "🟢 Discord Synced" : "⚪ Discord Not Linked"}
            </p>
          </div>
        </div>
      </div>

      {/* One-Click Share Console */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">One-Click Share Console</h3>
        <div className="flex gap-2">
          <Input readOnly value={link} className="flex-1 bg-slate-900/60 border-slate-700 text-slate-300 font-mono text-xs" />
          <Button onClick={copyLink} className={`gap-1.5 ${copied ? "bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button onClick={() => setShowQR(true)} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800">
            <QrCode className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
          <a href={shareUrls.telegram} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-colors">
            <Send className="w-4 h-4" />
          </a>
          <a href={shareUrls.whatsapp} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            <MessageCircle className="w-4 h-4" />
          </a>
          <a href={shareUrls.twitter} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-700/30 border border-slate-600/40 text-slate-300 hover:bg-slate-700/50 transition-colors">
            <Twitter className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* QR Code Modal */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Scan to Join</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link)}`} alt="QR Code" className="w-60 h-60 rounded-lg bg-white p-2" />
            <p className="text-xs text-slate-400 text-center">Share this QR code with a friend to scan and sign up instantly.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}