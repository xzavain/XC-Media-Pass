import React from "react";
import { Link2, UserPlus, Wallet } from "lucide-react";

const steps = [
  { icon: Link2, title: "Share Your Link", desc: "Share your unique referral link with a peer or household member." },
  { icon: UserPlus, title: "They Sign Up", desc: "They sign up for a plan (e.g., $10/mo tier)." },
  { icon: Wallet, title: "You Get Credit", desc: "Receive an immediate one-time $10.00 credit adjustment to your wallet. Your next $10 invoice is 100% paid for." },
];

export default function HowItWorksCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">How The Credit Works</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                {i < steps.length - 1 && <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/40 to-transparent" />}
              </div>
              <h4 className="text-sm font-semibold text-white mt-3">{s.title}</h4>
              <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
        <p className="text-xs text-indigo-300 leading-relaxed">
          <strong>Give $0 upfront, get your bill wiped.</strong> When your friend signs up for any pass (e.g., $10/mo), a 1-time $10 credit is added to your account balance to pay your next invoice automatically. Not recurring, no limit on referrals!
        </p>
      </div>
    </div>
  );
}