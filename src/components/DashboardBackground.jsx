import React from "react";

// Admin background — the login screen's animation (pulsing lime grid, scanning
// beams, drifting green glow orbs, corner accents) at matching intensity, plus a
// dashboard-only dot-matrix layer. Fixed, behind everything, non-interactive.

export default function DashboardBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
      {/* Pulsing tech grid (same as login) */}
      <div
        className="absolute inset-0 animate-grid-pulse"
        style={{
          backgroundImage:
            "linear-gradient(rgba(163,230,53,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />

      {/* Dashboard signature: dot matrix in opposite corners */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(rgba(163,230,53,0.45) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          maskImage: "linear-gradient(135deg, black 0%, transparent 35%, transparent 65%, black 100%)",
          WebkitMaskImage: "linear-gradient(135deg, black 0%, transparent 35%, transparent 65%, black 100%)",
        }}
      />

      {/* Scanning beams */}
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-lime-400/60 to-transparent animate-scan-y" />
      <div className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-emerald-400/50 to-transparent animate-scan-x" />

      {/* Corner accents */}
      <div className="absolute top-6 right-6 w-24 h-24 border-r-2 border-t-2 border-lime-500/40 animate-corner-flicker" />
      <div className="absolute bottom-6 right-6 w-24 h-24 border-r-2 border-b-2 border-emerald-500/40 animate-corner-flicker" style={{ animationDelay: "2s" }} />

      {/* Drifting green glows (login intensity) */}
      <div className="absolute top-[30%] left-[65%] w-[34rem] h-[34rem] rounded-full bg-lime-500/25 blur-[100px] animate-glow-drift-a" />
      <div className="absolute top-[75%] left-[35%] w-[28rem] h-[28rem] rounded-full bg-emerald-500/25 blur-[90px] animate-glow-drift-b" />
      <div className="absolute top-1/2 left-1/2 w-[20rem] h-[20rem] rounded-full bg-lime-400/15 blur-[80px] animate-glow-drift-c" />
    </div>
  );
}