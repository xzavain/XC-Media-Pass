import React from "react";

// Reusable animated tech background: pulsing grid, scanning beams, drifting glow orbs.
// Same effect used on the login page. Fixed behind content (z-0); place page content
// above it with `relative z-10`.

export default function TechGlowBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      {/* Pulsing tech grid */}
      <div
        className="absolute inset-0 animate-grid-pulse"
        style={{
          backgroundImage:
            "linear-gradient(rgba(163,230,53,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 35%, transparent 75%)",
        }}
      />
      {/* Horizontal scanning beam */}
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-lime-400/60 to-transparent animate-scan-y" />
      {/* Vertical scanning beam */}
      <div className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-emerald-400/50 to-transparent animate-scan-x" />
      {/* Subtle corner tech accents */}
      <div className="absolute top-10 left-10 w-24 h-24 border-l-2 border-t-2 border-lime-500/30 animate-corner-flicker" />
      <div className="absolute bottom-10 right-10 w-24 h-24 border-r-2 border-b-2 border-emerald-500/30 animate-corner-flicker" style={{ animationDelay: "2s" }} />
      {/* Green tech glow — defined, drifting orbs */}
      <div className="absolute top-1/2 left-1/2 w-[32rem] h-[32rem] rounded-full bg-lime-500/30 blur-[90px] animate-glow-drift-a" />
      <div className="absolute top-1/2 left-1/2 w-[26rem] h-[26rem] rounded-full bg-emerald-500/25 blur-[80px] animate-glow-drift-b" />
      <div className="absolute top-1/2 left-1/2 w-[20rem] h-[20rem] rounded-full bg-lime-400/20 blur-[70px] animate-glow-drift-c" />
    </div>
  );
}