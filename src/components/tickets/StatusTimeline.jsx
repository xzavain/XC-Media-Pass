import React from "react";
import { Check } from "lucide-react";

const STEPS = [
  { key: "open", label: "Submitted" },
  { key: "in_progress", label: "Under Review" },
  { key: "waiting_on_customer", label: "Awaiting Your Feedback" },
  { key: "resolved", label: "Resolved" },
];

export default function StatusTimeline({ status }) {
  const statusOrder = ["open", "pending", "in_progress", "waiting_on_customer", "resolved", "closed"];
  const currentIdx = statusOrder.indexOf(status);
  const activeStep = status === "closed" ? 3 : STEPS.findIndex((s, i) => {
    const stepIdx = statusOrder.indexOf(s.key);
    return currentIdx < stepIdx || i === STEPS.length - 1;
  });

  const completedStep = status === "resolved" || status === "closed" ? 3 : Math.max(0, activeStep - 1);

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {STEPS.map((step, i) => {
        const isDone = i <= completedStep;
        const isCurrent = i === activeStep && status !== "resolved" && status !== "closed";
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${
                  isDone
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                    : isCurrent
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400 animate-pulse"
                    : "bg-slate-800 border-slate-700 text-slate-600"
                }`}
              >
                {isDone ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-[10px] text-center hidden sm:block ${isDone || isCurrent ? "text-slate-300" : "text-slate-600"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full ${i < completedStep ? "bg-emerald-500/40" : "bg-slate-800"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}