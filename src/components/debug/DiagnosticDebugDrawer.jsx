import { useState, useEffect } from "react";
import { useDebugContext } from "@/lib/DebugContext";
import { ChevronDown, ChevronUp, Wrench } from "lucide-react";

export default function DiagnosticDebugDrawer() {
  const { isDebugMode, setIsDebugMode } = useDebugContext();
  const [expanded, setExpanded] = useState(true);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!isDebugMode) return null;

  const debugRows = [
    { label: "Current Route", value: window.location.pathname },
    { label: "Viewport", value: `${viewport.w} × ${viewport.h}` },
    { label: "Active Node", value: "—" },
    { label: "Server Latency", value: "—" },
    { label: "Transcode Codec", value: "direct_play" },
    { label: "Session Token", value: "—" },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-[360px] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden font-mono">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-200 truncate">🛠️ Node Diagnostics &amp; Stream State</span>
        </div>
        <button
          onClick={() => setIsDebugMode(false)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 text-xs font-semibold transition-colors flex-shrink-0"
        >
          ✕ Close Debug
        </button>
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <span>{expanded ? "Hide Details" : "Show Details"}</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-1.5">
          {debugRows.map((row) => (
            <div key={row.label} className="flex justify-between gap-2 text-xs">
              <span className="text-slate-500 flex-shrink-0">{row.label}:</span>
              <span className="text-slate-200 truncate">{row.value}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-slate-700/50 text-[10px] text-slate-600">
            Press Ctrl+Shift+D to toggle debug mode
          </div>
        </div>
      )}
    </div>
  );
}