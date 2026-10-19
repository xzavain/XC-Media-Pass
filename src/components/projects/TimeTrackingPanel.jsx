import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Plus, Trash2, Loader2 } from "lucide-react";
import moment from "moment";

export default function TimeTrackingPanel({ task, user, onActivity }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!task) return;
    setLoading(true);
    const data = await base44.entities.TaskTimeEntry.filter({ task_id: task.id }, "-logged_at");
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [task?.id]);

  const handleLog = async (e) => {
    e.preventDefault();
    const h = parseFloat(hours);
    if (!h || h <= 0) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const entry = await base44.entities.TaskTimeEntry.create({
        task_id: task.id,
        project_id: task.project_id,
        hours: h,
        description: desc.trim(),
        logged_by_name: user?.full_name,
        logged_by_email: user?.email,
        logged_at: now,
      });
      const newSpent = (task.spent_hours || 0) + h;
      await base44.entities.ProjectTask.update(task.id, { spent_hours: newSpent });
      await base44.entities.TaskActivity.create({
        task_id: task.id,
        type: "time_logged",
        content: `Logged ${h}h${desc.trim() ? `: ${desc.trim()}` : ""}`,
        actor_name: user?.full_name,
        actor_email: user?.email,
      });
      onActivity?.({ ...entry, spent_hours: newSpent });
      setEntries((prev) => [entry, ...prev]);
      setHours("");
      setDesc("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    await base44.entities.TaskTimeEntry.delete(entry.id);
    const newSpent = Math.max(0, (task.spent_hours || 0) - entry.hours);
    await base44.entities.ProjectTask.update(task.id, { spent_hours: newSpent });
    onActivity?.({ spent_hours: newSpent });
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
  };

  const estimated = task?.estimated_hours || 0;
  const spent = task?.spent_hours || 0;
  const overBudget = estimated > 0 && spent > estimated;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
        <Clock className="w-4 h-4 text-zinc-400" />
        Time Tracking
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-2 text-center">
          <p className="text-xs text-zinc-500">Estimated</p>
          <p className="text-sm font-semibold text-zinc-200">{estimated}h</p>
        </div>
        <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-2 text-center">
          <p className="text-xs text-zinc-500">Spent</p>
          <p className={`text-sm font-semibold ${overBudget ? "text-red-400" : "text-lime-400"}`}>{spent.toFixed(1)}h</p>
        </div>
        <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-2 text-center">
          <p className="text-xs text-zinc-500">Remaining</p>
          <p className="text-sm font-semibold text-zinc-300">{estimated > 0 ? Math.max(0, estimated - spent).toFixed(1) : "—"}h</p>
        </div>
      </div>
      <form onSubmit={handleLog} className="flex gap-2">
        <Input
          type="number"
          step="0.25"
          min="0"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="h"
          className="w-16 bg-zinc-800 border-zinc-700 text-zinc-100"
        />
        <Input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="What did you work on?"
          className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100"
        />
        <Button type="submit" disabled={saving || !hours} size="sm" className="bg-lime-600 hover:bg-lime-700 text-white">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        </Button>
      </form>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-zinc-500">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-zinc-600">No time logged yet.</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-xs group rounded px-2 py-1 hover:bg-zinc-800/40">
              <span className="text-lime-400 font-medium w-10">{e.hours}h</span>
              <span className="text-zinc-400 flex-1 truncate">{e.description || "—"}</span>
              <span className="text-zinc-600">{moment(e.logged_at).fromNow()}</span>
              <span className="text-zinc-500 hidden group-hover:hidden">{e.logged_by_name?.split(" ")[0]}</span>
              <button onClick={() => handleDelete(e)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}