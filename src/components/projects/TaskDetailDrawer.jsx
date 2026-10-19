import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Plus, Trash2, ChevronRight, Tag as TagIcon, X, GitBranch, ListTree } from "lucide-react";
import { WORK_PACKAGE_TYPES, PRIORITY_CONFIG } from "@/lib/projectUtils";
import TaskChecklist from "@/components/projects/TaskChecklist";
import TimeTrackingPanel from "@/components/projects/TimeTrackingPanel";
import TicketLinker from "@/components/projects/TicketLinker";
import TaskActivityFeed from "@/components/projects/TaskActivityFeed";

const quillModules = { toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]] };

export default function TaskDetailDrawer({ task, open, onOpenChange, user, staffList, projectTasks, onUpdated, onTaskClick }) {
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState([]);

  useEffect(() => {
    if (!task) return;
    setDesc(task.description || "");
    setTags(task.tags || []);
    base44.entities.ProjectTask.filter({ parent_task_id: task.id }, "order").then(setSubtasks);
  }, [task?.id]);

  if (!task) return null;

  const update = async (patch, activity) => {
    const updated = await base44.entities.ProjectTask.update(task.id, patch);
    if (activity) {
      await base44.entities.TaskActivity.create({ task_id: task.id, type: activity.type, content: activity.content, actor_name: user?.full_name, actor_email: user?.email });
    }
    onUpdated?.(updated);
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const created = await base44.entities.ProjectTask.create({
      project_id: task.project_id, column_id: task.column_id, title: newSubtask.trim(),
      parent_task_id: task.id, order: subtasks.length, work_package_type: "task", priority: "medium",
      created_by_name: user?.full_name, created_by_email: user?.email,
    });
    setSubtasks((prev) => [...prev, created]);
    await base44.entities.TaskActivity.create({ task_id: task.id, type: "created", content: `Subtask created: ${newSubtask.trim()}`, actor_name: user?.full_name, actor_email: user?.email });
    setNewSubtask("");
  };

  const handleAddDependency = async (depId) => {
    if (!depId || (task.depends_on || []).includes(depId)) return;
    const newDeps = [...(task.depends_on || []), depId];
    const depTask = projectTasks?.find((t) => t.id === depId);
    await update({ depends_on: newDeps }, { type: "dependency_added", content: `Added dependency: ${depTask?.title || depId}` });
  };

  const handleRemoveDependency = async (depId) => {
    const newDeps = (task.depends_on || []).filter((id) => id !== depId);
    await update({ depends_on: newDeps }, { type: "dependency_added", content: `Removed dependency` });
  };

  const handleSaveDesc = () => {
    if (desc !== (task.description || "")) update({ description: desc });
  };

  const addTag = (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      e.preventDefault();
      const tag = e.target.value.trim();
      if (!tags.includes(tag)) {
        const next = [...tags, tag];
        setTags(next);
        update({ tags: next });
      }
      e.target.value = "";
    }
  };

  const removeTag = (tag) => {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    update({ tags: next });
  };

  const cfg = WORK_PACKAGE_TYPES[task.work_package_type] || WORK_PACKAGE_TYPES.task;
  const dependencies = (task.depends_on || []).map((id) => projectTasks?.find((t) => t.id === id)).filter(Boolean);
  const availableDeps = (projectTasks || []).filter((t) => t.id !== task.id && !(task.depends_on || []).includes(t.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-zinc-900 border-zinc-800 text-white w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
            {task.parent_task_id && (
              <button onClick={() => onTaskClick?.(projectTasks?.find((t) => t.id === task.parent_task_id))} className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1">
                <ChevronRight className="w-3 h-3 rotate-180" /> Parent
              </button>
            )}
          </div>
          <SheetTitle className="text-left">
            <input
              defaultValue={task.title}
              onBlur={(e) => e.target.value !== task.title && update({ title: e.target.value }, { type: "status_change", content: `Renamed to "${e.target.value}"` })}
              className="bg-transparent border-none outline-none w-full text-lg font-semibold text-white focus:bg-zinc-800/50 rounded px-1"
            />
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4" key={task?.id}>
          {/* Properties */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-zinc-500">Type</Label>
              <Select value={task.work_package_type} onValueChange={(v) => update({ work_package_type: v }, { type: "type_change", content: `Type changed to ${WORK_PACKAGE_TYPES[v]?.label}` })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">{Object.entries(WORK_PACKAGE_TYPES).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-zinc-500">Priority</Label>
              <Select value={task.priority} onValueChange={(v) => update({ priority: v }, { type: "priority_change", content: `Priority changed to ${PRIORITY_CONFIG[v]?.label}` })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">{Object.entries(PRIORITY_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-zinc-500">Story Points</Label>
              <Input type="number" defaultValue={task.story_points || 0} onBlur={(e) => update({ story_points: parseFloat(e.target.value) || 0 })} className="bg-zinc-800 border-zinc-700 h-8 text-sm mt-0.5" />
            </div>
            <div>
              <Label className="text-xs text-zinc-500">Est. Hours</Label>
              <Input type="number" step="0.25" defaultValue={task.estimated_hours || 0} onBlur={(e) => update({ estimated_hours: parseFloat(e.target.value) || 0 })} className="bg-zinc-800 border-zinc-700 h-8 text-sm mt-0.5" />
            </div>
            <div>
              <Label className="text-xs text-zinc-500">Start Date</Label>
              <Input type="date" defaultValue={task.start_date || ""} onBlur={(e) => update({ start_date: e.target.value })} className="bg-zinc-800 border-zinc-700 h-8 text-sm mt-0.5" />
            </div>
            <div>
              <Label className="text-xs text-zinc-500">Due Date</Label>
              <Input type="date" defaultValue={task.due_date || ""} onBlur={(e) => update({ due_date: e.target.value })} className="bg-zinc-800 border-zinc-700 h-8 text-sm mt-0.5" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-zinc-500">Milestone / Version</Label>
              <Input defaultValue={task.milestone || ""} onBlur={(e) => update({ milestone: e.target.value })} placeholder="e.g. v1.0, Sprint 5" className="bg-zinc-800 border-zinc-700 h-8 text-sm mt-0.5" />
            </div>
          </div>

          {/* Assignees */}
          <div>
            <Label className="text-xs text-zinc-500 mb-1 block">Assignees</Label>
            <div className="max-h-28 overflow-y-auto space-y-0.5 rounded-lg border border-zinc-700 bg-zinc-800/50 p-1.5">
              {(staffList || []).map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer hover:bg-zinc-800/60 rounded px-1.5 py-0.5">
                  <Checkbox
                    checked={(task.assignee_emails || []).includes(s.email)}
                    onCheckedChange={(checked) => {
                      const cur = task.assignee_emails || [];
                      const next = checked ? [...cur, s.email] : cur.filter((e) => e !== s.email);
                      update({ assignee_emails: next, assignee_names: next.map((e) => staffList?.find((x) => x.email === e)?.full_name).filter(Boolean) }, { type: "assignment_change", content: `Assignees updated` });
                    }}
                  />
                  {s.full_name || s.email}
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><TagIcon className="w-3 h-3" /> Tags</Label>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-0.5">
                  {tag}<button onClick={() => removeTag(tag)}><X className="w-3 h-3 text-zinc-500 hover:text-red-400" /></button>
                </span>
              ))}
            </div>
            <Input placeholder="Type tag + Enter" onKeyDown={addTag} className="bg-zinc-800 border-zinc-700 h-8 text-sm" />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-zinc-500 mb-1 block">Description</Label>
            <div className="kb-editor rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
              <ReactQuill theme="snow" value={desc} onChange={setDesc} modules={quillModules} />
            </div>
            <Button size="sm" variant="outline" onClick={handleSaveDesc} className="mt-1.5 border-zinc-700 text-xs">Save Description</Button>
          </div>

          {/* Subtasks */}
          <div>
            <Label className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><ListTree className="w-3.5 h-3.5" /> Subtasks</Label>
            <div className="space-y-1 mb-2">
              {subtasks.length === 0 && <p className="text-xs text-zinc-600">No subtasks.</p>}
              {subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 text-xs group rounded px-2 py-1 hover:bg-zinc-800/40">
                  <span className={`w-1.5 h-1.5 rounded-full ${(WORK_PACKAGE_TYPES[st.work_package_type] || WORK_PACKAGE_TYPES.task).dot}`} />
                  <button onClick={() => onTaskClick?.(st)} className="text-zinc-200 hover:text-lime-400 flex-1 text-left truncate">{st.title}</button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Add subtask…" className="bg-zinc-800 border-zinc-700 h-8 text-sm" />
              <Button type="submit" size="sm" disabled={!newSubtask.trim()} className="bg-lime-600 hover:bg-lime-700 text-white"><Plus className="w-3.5 h-3.5" /></Button>
            </form>
          </div>

          {/* Dependencies */}
          <div>
            <Label className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> Dependencies (Predecessors)</Label>
            <div className="space-y-1 mb-2">
              {dependencies.length === 0 && <p className="text-xs text-zinc-600">No dependencies.</p>}
              {dependencies.map((dep) => (
                <div key={dep.id} className="flex items-center gap-2 text-xs group rounded px-2 py-1 hover:bg-zinc-800/40">
                  <button onClick={() => onTaskClick?.(dep)} className="text-zinc-200 hover:text-lime-400 flex-1 text-left truncate">{dep.title}</button>
                  <button onClick={() => handleRemoveDependency(dep.id)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            {availableDeps.length > 0 && (
              <Select value="" onValueChange={handleAddDependency}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-sm"><span className="text-zinc-500">Add dependency…</span></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 max-h-56 overflow-y-auto">
                  {availableDeps.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Checklist */}
          <TaskChecklist checklist={task.checklist} onUpdate={(cl) => update({ checklist: cl }, { type: "checklist_update", content: "Checklist updated" })} />

          {/* Time Tracking */}
          <TimeTrackingPanel task={task} user={user} onActivity={(data) => onUpdated?.({ ...task, ...data })} />

          {/* Linked Tickets */}
          <TicketLinker task={task} user={user} onActivity={(data) => onUpdated?.({ ...task, ...data })} />

          {/* Activity */}
          <TaskActivityFeed task={task} user={user} />
        </div>
      </SheetContent>
    </Sheet>
  );
}