import React from "react";

/**
 * Animated circular SVG gauge for telemetry display.
 */
export default function TelemetryGauge({ value, max, label, unit, color = "#10b981", size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min((value || 0) / (max || 1), 1);
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">{value ?? "—"}</span>
          {unit && <span className="text-[10px] text-zinc-500">{unit}</span>}
        </div>
      </div>
      {label && <span className="text-xs text-zinc-400 mt-1.5">{label}</span>}
    </div>
  );
}