import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Lock, Globe, Pencil, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ProjectFormModal from "@/components/projects/ProjectFormModal";

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [taskCounts, setTaskCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [projs, tasks] = await Promise.all([
      base44.entities.Project.filter({ status: "active" }, "-created_date"),
      base44.entities.ProjectTask.list(),
    ]);
    setProjects(projs);
    const counts = {};
    tasks.forEach((t) => { counts[t.project_id] = (counts[t.project_id] || 0) + 1; });
    setTaskCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (editing) {
      await base44.entities.Project.update(editing.id, form);
      toast({ title: "Project updated" });
    } else {
      const project = await base44.entities.Project.create({
        ...form,
        created_by_name: user?.full_name,
        created_by_email: user?.email,
      });
      await base44.entities.ProjectColumn.bulkCreate([
        { project_id: project.id, name: "New", order: 0 },
        { project_id: project.id, name: "In Progress", order: 1 },
        { project_id: project.id, name: "Review", order: 2 },
        { project_id: project.id, name: "Testing", order: 3 },
        { project_id: project.id, name: "Done", order: 4 },
      ]);
      await base44.entities.ProjectBoard.create({
        project_id: project.id, name: "Status Board", board_type: "status", is_default: true,
        created_by_name: user?.full_name, created_by_email: user?.email,
      });
      toast({ title: "Project created" });
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (project) => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    await base44.entities.Project.delete(project.id);
    toast({ title: "Project deleted" });
    load();
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Projects</h1>
          <p className="text-sm text-zinc-400 mt-1">Agile work package management with boards, timelines, and cross-referencing.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-lime-600 hover:bg-lime-700 text-white gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
          <FolderKanban className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No projects yet. {isAdmin && "Create one to get started."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="group p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:border-lime-500/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <Link to={`/projects/${p.id}`} className="flex-1">
                  <FolderKanban className="w-5 h-5 text-lime-400 mb-2" />
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  {p.description && <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{p.description}</p>}
                </Link>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isAdmin && (
                    <>
                      <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1 text-zinc-500 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(p)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${p.visibility === "private" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
                  {p.visibility === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  {p.visibility === "private" ? "Private" : "Public"}
                </span>
                <span className="text-xs text-zinc-500">{taskCounts[p.id] || 0} tasks</span>
                <Link to={`/projects/${p.id}/timeline`} className="ml-auto text-xs text-zinc-500 hover:text-lime-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Timeline
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectFormModal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} project={editing} user={user} />
    </div>
  );
}