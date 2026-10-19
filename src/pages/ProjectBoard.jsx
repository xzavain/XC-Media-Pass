import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Calendar, Columns3 } from "lucide-react";
import KanbanBoard from "@/components/projects/KanbanBoard";
import TaskFormModal from "@/components/projects/TaskFormModal";
import TaskDetailDrawer from "@/components/projects/TaskDetailDrawer";
import BoardSwitcher from "@/components/projects/BoardSwitcher";
import BoardFormModal from "@/components/projects/BoardFormModal";
import { useToast } from "@/components/ui/use-toast";
import { getStaffList, avatarColor } from "@/lib/projectUtils";

const priorityAccents = { critical: "bg-red-500", high: "bg-amber-500", medium: "bg-sky-500", low: "bg-zinc-500" };

export default function ProjectBoard() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeColumn, setActiveColumn] = useState(null);
  const [preset, setPreset] = useState({});
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.get(projectId),
      base44.entities.ProjectBoard.filter({ project_id: projectId }, "created_date"),
      base44.entities.ProjectColumn.filter({ project_id: projectId }, "order"),
      base44.entities.ProjectTask.filter({ project_id: projectId }, "order"),
    ]).then(async ([proj, brds, cols, tks]) => {
      setProject(proj);
      setColumns(cols);
      setTasks(tks);
      if (brds.length === 0) {
        const board = await base44.entities.ProjectBoard.create({
          project_id: projectId, name: "Status Board", board_type: "status", is_default: true,
          created_by_name: user?.full_name, created_by_email: user?.email,
        });
        setBoards([board]);
        setActiveBoardId(board.id);
      } else {
        setBoards(brds);
        setActiveBoardId(brds[0].id);
      }
      setLoading(false);
    });
    getStaffList().then(setStaffList);
  }, [projectId]);

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const boardType = activeBoard?.board_type || "status";

  const boardColumns = useMemo(() => {
    if (boardType === "status") return columns;
    if (boardType === "priority") {
      return [
        { id: "critical", name: "Critical" }, { id: "high", name: "High" },
        { id: "medium", name: "Medium" }, { id: "low", name: "Low" },
      ];
    }
    if (boardType === "assignee") {
      const map = new Map();
      tasks.forEach((t) => (t.assignee_emails || []).forEach((email) => {
        if (!map.has(email)) {
          const s = staffList.find((x) => x.email === email);
          map.set(email, s?.full_name || email);
        }
      }));
      const cols = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
      return [{ id: "unassigned", name: "Unassigned" }, ...cols];
    }
    if (boardType === "milestone") {
      const map = new Map();
      map.set("__none__", "No Milestone");
      tasks.forEach((t) => { if (t.milestone && !map.has(t.milestone)) map.set(t.milestone, t.milestone); });
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }
    return columns;
  }, [boardType, columns, tasks, staffList]);

  const tasksByColumn = useMemo(() => {
    const acc = {};
    boardColumns.forEach((c) => { acc[c.id] = []; });
    tasks.forEach((t) => {
      let colId;
      if (boardType === "status") colId = t.column_id;
      else if (boardType === "assignee") colId = t.assignee_emails?.[0] || "unassigned";
      else if (boardType === "milestone") colId = t.milestone || "__none__";
      else if (boardType === "priority") colId = t.priority;
      if (acc[colId]) acc[colId].push(t);
    });
    Object.keys(acc).forEach((k) => acc[k].sort((a, b) => (a.order || 0) - (b.order || 0)));
    return acc;
  }, [boardColumns, tasks, boardType]);

  const accents = useMemo(() => {
    const map = {};
    if (boardType === "priority") Object.assign(map, priorityAccents);
    else if (boardType === "assignee") boardColumns.forEach((c) => { if (c.id !== "unassigned") map[c.id] = avatarColor(c.id); });
    return map;
  }, [boardType, boardColumns]);

  const handleDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;
    const destColId = destination.droppableId;

    if (boardType === "status") {
      const sourceList = [...(tasksByColumn[source.droppableId] || [])];
      const [moved] = sourceList.splice(source.index, 1);
      const destList = source.droppableId === destColId ? sourceList : [...(tasksByColumn[destColId] || [])];
      destList.splice(destination.index, 0, moved);
      const updates = destList.map((t, i) => ({ id: t.id, column_id: destColId, order: i }));
      if (source.droppableId !== destColId) sourceList.forEach((t, i) => updates.push({ id: t.id, column_id: source.droppableId, order: i }));
      setTasks((prev) => prev.map((t) => { const u = updates.find((x) => x.id === t.id); return u ? { ...t, ...u } : t; }));
      await base44.entities.ProjectTask.bulkUpdate(updates);
      return;
    }

    const task = tasksByColumn[source.droppableId]?.[source.index];
    if (!task) return;
    let patch = {};
    if (boardType === "assignee") patch = { assignee_emails: destColId === "unassigned" ? [] : [destColId] };
    else if (boardType === "milestone") patch = { milestone: destColId === "__none__" ? "" : destColId };
    else if (boardType === "priority") patch = { priority: destColId };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
    await base44.entities.ProjectTask.update(task.id, patch);
    await base44.entities.TaskActivity.create({ task_id: task.id, type: "status_change", content: `Moved via ${boardType} board`, actor_name: user?.full_name, actor_email: user?.email });
  };

  const handleInlineUpdate = async (taskId, patch) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
    setSelected((prev) => (prev?.id === taskId ? { ...prev, ...patch } : prev));
    await base44.entities.ProjectTask.update(taskId, patch);
  };

  const handleAddTask = (column) => {
    setEditingTask(null);
    setActiveColumn(column);
    if (boardType === "status") setPreset({ column_id: column.id });
    else if (boardType === "assignee") setPreset({ assignee_emails: column.id === "unassigned" ? [] : [column.id] });
    else if (boardType === "milestone") setPreset({ milestone: column.id === "__none__" ? "" : column.id });
    else if (boardType === "priority") setPreset({ priority: column.id });
    setShowForm(true);
  };

  const handleSaveTask = async (form, newFiles) => {
    if (editingTask) {
      const updated = await base44.entities.ProjectTask.update(editingTask.id, form);
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? { ...t, ...updated } : t)));
    } else {
      const order = (tasksByColumn[activeColumn?.id] || []).length;
      const created = await base44.entities.ProjectTask.create({
        ...form, project_id: projectId,
        column_id: boardType === "status" ? activeColumn.id : (columns[0]?.id || ""),
        order, created_by_name: user?.full_name, created_by_email: user?.email,
      });
      if (newFiles.length > 0) await base44.entities.TaskAttachment.bulkCreate(newFiles.map((f) => ({ ...f, task_id: created.id })));
      setTasks((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingTask(null);
    toast({ title: editingTask ? "Work package updated" : "Work package created" });
  };

  const handleCreateBoard = async (form) => {
    const created = await base44.entities.ProjectBoard.create({ ...form, project_id: projectId, created_by_name: user?.full_name, created_by_email: user?.email });
    setBoards((prev) => [...prev, created]);
    setActiveBoardId(created.id);
    setShowBoardForm(false);
    toast({ title: "Board created" });
  };

  const handleDeleteBoard = async (board) => {
    await base44.entities.ProjectBoard.delete(board.id);
    const remaining = boards.filter((b) => b.id !== board.id);
    setBoards(remaining);
    if (activeBoardId === board.id) setActiveBoardId(remaining[0]?.id || null);
    toast({ title: "Board deleted" });
  };

  if (loading) return <div className="p-8 text-zinc-300">Loading…</div>;
  if (!project) return <div className="p-8 text-zinc-300">Project not found.</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-3 mb-2">
          <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Projects
          </Link>
          <span className="text-zinc-600">/</span>
          <h1 className="text-lg font-semibold text-white">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BoardSwitcher
            boards={boards}
            activeBoardId={activeBoardId}
            onSelect={setActiveBoardId}
            onCreate={() => setShowBoardForm(true)}
            onDelete={user?.role === "admin" ? handleDeleteBoard : null}
          />
          <Link to={`/projects/${projectId}/timeline`}>
            <button className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800">
              <Calendar className="w-4 h-4" /> Timeline
            </button>
          </Link>
          <span className="text-xs text-zinc-500 ml-auto capitalize">
            <Columns3 className="w-3.5 h-3.5 inline mr-1" />
            {boardType} board · {tasks.length} work packages
          </span>
        </div>
      </div>

      <KanbanBoard
        columns={boardColumns}
        tasksByColumn={tasksByColumn}
        onDragEnd={handleDragEnd}
        onAddTask={handleAddTask}
        onTaskClick={(t) => setSelected(t)}
        onUpdate={handleInlineUpdate}
        staffList={staffList}
        accents={accents}
      />

      <TaskFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingTask(null); }}
        onSave={handleSaveTask}
        task={editingTask}
        user={user}
        staffList={staffList}
        projectTasks={tasks}
        preset={preset}
      />

      <TaskDetailDrawer
        task={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        user={user}
        staffList={staffList}
        projectTasks={tasks}
        onUpdated={(updated) => { setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))); setSelected((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev)); }}
        onTaskClick={(t) => setSelected(t)}
      />

      <BoardFormModal open={showBoardForm} onClose={() => setShowBoardForm(false)} onSave={handleCreateBoard} />
    </div>
  );
}