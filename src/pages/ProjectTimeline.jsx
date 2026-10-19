import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Calendar } from "lucide-react";
import GanttChart from "@/components/projects/GanttChart";
import TaskDetailDrawer from "@/components/projects/TaskDetailDrawer";
import { getStaffList } from "@/lib/projectUtils";

export default function ProjectTimeline() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.get(projectId),
      base44.entities.ProjectTask.filter({ project_id: projectId }, "order"),
    ]).then(([proj, tks]) => {
      setProject(proj);
      setTasks(tks);
      setLoading(false);
    });
    getStaffList().then(setStaffList);
  }, [projectId]);

  if (loading) return <div className="p-8 text-zinc-300">Loading…</div>;
  if (!project) return <div className="p-8 text-zinc-300">Project not found.</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3 mb-1">
          <Link to={`/projects/${projectId}`} className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Board
          </Link>
          <span className="text-zinc-600">/</span>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-lime-400" />
            {project.name} — Timeline
          </h1>
        </div>
        <p className="text-sm text-zinc-500">Gantt view of all work packages. Click a bar to open details.</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <GanttChart tasks={tasks} onTaskClick={(t) => setSelected(t)} />
      </div>
      <TaskDetailDrawer
        task={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        user={user}
        staffList={staffList}
        projectTasks={tasks}
        onUpdated={(updated) => setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)))}
        onTaskClick={(t) => setSelected(t)}
      />
    </div>
  );
}