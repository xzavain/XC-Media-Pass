import { base44 } from "@/api/base44Client";

export const WORK_PACKAGE_TYPES = {
  feature: { label: "Feature", color: "bg-violet-500/10 text-violet-400 border-violet-500/20", dot: "bg-violet-500" },
  bug: { label: "Bug", color: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-500" },
  task: { label: "Task", color: "bg-sky-500/10 text-sky-400 border-sky-500/20", dot: "bg-sky-500" },
  milestone: { label: "Milestone", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-500" },
  phase: { label: "Phase", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
};

export const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  medium: { label: "Medium", color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  high: { label: "High", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  critical: { label: "Critical", color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export const BOARD_TYPES = {
  status: { label: "Status Board", description: "Columns reflect workflow stages" },
  assignee: { label: "Assignee Board", description: "Columns reflect team members" },
  milestone: { label: "Milestone Board", description: "Columns reflect versions/milestones" },
  priority: { label: "Priority Board", description: "Columns reflect priority levels" },
};

export function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function avatarColor(seed) {
  const colors = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-teal-500"];
  let hash = 0;
  for (let i = 0; i < (seed || "").length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export async function getStaffList() {
  const users = await base44.entities.User.list();
  return users.filter((u) => u.role === "admin" || u.role === "staff");
}

export function checklistProgress(checklist) {
  if (!checklist || checklist.length === 0) return null;
  const done = checklist.filter((c) => c.done).length;
  return { done, total: checklist.length, pct: Math.round((done / checklist.length) * 100) };
}