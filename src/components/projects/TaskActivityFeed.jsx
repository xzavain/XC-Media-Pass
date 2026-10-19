import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare } from "lucide-react";
import moment from "moment";

const typeLabels = {
  comment: "Comment", status_change: "Status", attachment_added: "Attachment", created: "Created",
  assignment_change: "Assignment", priority_change: "Priority", date_change: "Date", type_change: "Type",
  estimate_change: "Estimate", checklist_update: "Checklist", ticket_linked: "Ticket Linked",
  ticket_unlinked: "Ticket Unlinked", dependency_added: "Dependency", time_logged: "Time Logged", parent_changed: "Parent",
};

export default function TaskActivityFeed({ task, user }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    if (!task) return;
    setLoading(true);
    const data = await base44.entities.TaskActivity.filter({ task_id: task.id }, "-created_date");
    setActivities(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [task?.id]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const created = await base44.entities.TaskActivity.create({
        task_id: task.id, type: "comment", content: comment.trim(),
        actor_name: user?.full_name, actor_email: user?.email,
      });
      setActivities((prev) => [created, ...prev]);
      setComment("");
    } finally { setPosting(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
        <MessageSquare className="w-4 h-4 text-zinc-400" /> Activity & Comments
      </div>
      <form onSubmit={handleComment} className="flex gap-2">
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" rows={2} className="bg-zinc-800 border-zinc-700 text-zinc-100 text-sm" />
        <Button type="submit" disabled={posting || !comment.trim()} size="sm" className="bg-lime-600 hover:bg-lime-700 text-white self-end">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {loading ? <p className="text-xs text-zinc-500">Loading…</p>
          : activities.length === 0 ? <p className="text-xs text-zinc-600">No activity yet.</p>
          : activities.map((a) => (
            <div key={a.id} className={`rounded-lg p-2.5 text-xs ${a.type === "comment" ? "bg-zinc-800/60 border border-zinc-700/50" : "bg-zinc-900/40 border border-zinc-800/40"}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-medium text-zinc-300">{a.actor_name || a.actor_email || "System"}</span>
                <span className="text-zinc-600">{moment(a.created_date).fromNow()}</span>
              </div>
              {a.type !== "comment" && a.type !== "created" && (
                <span className="text-[10px] text-lime-500/70 uppercase tracking-wide">{typeLabels[a.type] || a.type}</span>
              )}
              <p className={`mt-0.5 ${a.type === "comment" ? "text-zinc-200" : "text-zinc-400"}`}>{a.content}</p>
            </div>
          ))}
      </div>
    </div>
  );
}