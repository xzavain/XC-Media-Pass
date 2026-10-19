import React, { useState } from "react";
import { Star } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CsatRating({ ticket, onRated }) {
  const [score, setScore] = useState(ticket?.csat_score || 0);
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(!!ticket?.csat_score);

  const handleRate = async (value) => {
    setScore(value);
    setSubmitted(true);
    try {
      await base44.entities.Ticket.update(ticket.id, { csat_score: value });
      onRated?.(value);
    } catch {}
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`w-4 h-4 ${n <= score ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
          ))}
        </div>
        <span className="text-xs text-emerald-400">Thank you for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2">
      <p className="text-sm font-semibold text-slate-200">How quickly did our team solve your issue?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleRate(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            <Star className={`w-7 h-7 transition-colors ${(hover || score) >= n ? "fill-amber-400 text-amber-400" : "text-slate-600 hover:text-amber-500"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}