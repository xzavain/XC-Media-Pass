import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Link2, CheckSquare, Users } from "lucide-react";
import { WORK_PACKAGE_TYPES, getInitials, avatarColor, checklistProgress } from "@/lib/projectUtils";

function InlineInput({ defaultValue, type, onUpdate, className }) {
  const [val, setVal] = useState(defaultValue ?? "");
  return (
    <Input
      type={type}
      value={val}
      autoFocus
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onUpdate(type === "number" ? parseFloat(val) || 0 : val)}
      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
      className={className}
    />
  );
}

const priorityBorder = {
  low: "border-l-zinc-600",
  medium: "border-l-sky-500",
  high: "border-l-amber-500",
  critical: "border-l-red-500",
};

export default function KanbanCard({ task, index, onClick, onUpdate, staffList }) {
  const cfg = WORK_PACKAGE_TYPES[task.work_package_type] || WORK_PACKAGE_TYPES.task;
  const progress = checklistProgress(task.checklist);
  const linkedCount = (task.linked_ticket_ids || []).length;
  const stop = (e) => e.stopPropagation();

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`p-2.5 rounded-lg border border-l-2 border-zinc-800 ${priorityBorder[task.priority] || priorityBorder.medium} bg-zinc-900/70 cursor-pointer hover:border-zinc-700 transition-colors ${snapshot.isDragging ? "shadow-lg ring-1 ring-lime-500/40" : ""}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
            <Popover>
              <PopoverTrigger asChild>
                <button onClick={stop} className={`text-[10px] px-1.5 py-0.5 rounded ${task.story_points ? "bg-lime-500/10 text-lime-400" : "text-zinc-600 hover:text-zinc-400"}`}>
                  {task.story_points || "—"} SP
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-36 bg-zinc-800 border-zinc-700" onClick={stop}>
                <InlineInput defaultValue={task.story_points || 0} type="number" onUpdate={(v) => onUpdate(task.id, { story_points: v })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
              </PopoverContent>
            </Popover>
          </div>

          <p className="text-sm font-medium text-zinc-100 mb-2">{task.title}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <button onClick={stop} className="flex items-center -space-x-1.5">
                    {(task.assignee_emails || []).slice(0, 2).map((email, i) => {
                      const s = staffList?.find((x) => x.email === email);
                      return (
                        <div key={i} className={`w-5 h-5 rounded-full ${avatarColor(email)} flex items-center justify-center text-[10px] text-white border border-zinc-800`}>
                          {getInitials(s?.full_name || email)}
                        </div>
                      );
                    })}
                    {(task.assignee_emails || []).length === 0 && (
                      <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400">
                        <Users className="w-3 h-3" />
                      </div>
                    )}
                    {(task.assignee_emails || []).length > 2 && (
                      <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 border border-zinc-800">
                        +{task.assignee_emails.length - 2}
                      </div>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 bg-zinc-800 border-zinc-700 max-h-56 overflow-y-auto" onClick={stop}>
                  <div className="space-y-1">
                    {(staffList || []).map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer rounded px-1 py-0.5 hover:bg-zinc-700/50">
                        <Checkbox
                          checked={(task.assignee_emails || []).includes(s.email)}
                          onCheckedChange={(checked) => {
                            const cur = task.assignee_emails || [];
                            const next = checked ? [...cur, s.email] : cur.filter((e) => e !== s.email);
                            onUpdate(task.id, { assignee_emails: next, assignee_names: next.map((e) => staffList?.find((x) => x.email === e)?.full_name).filter(Boolean) });
                          }}
                        />
                        {s.full_name || s.email}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {progress && (
                <span className="text-[10px] text-zinc-500 flex items-center gap-0.5" title={`${progress.done}/${progress.total} checklist items`}>
                  <CheckSquare className="w-3 h-3" />{progress.done}/{progress.total}
                </span>
              )}
              {linkedCount > 0 && (
                <span className="text-[10px] text-zinc-500 flex items-center gap-0.5" title={`${linkedCount} linked ticket(s)`}>
                  <Link2 className="w-3 h-3" />{linkedCount}
                </span>
              )}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <button onClick={stop} className={`text-[10px] flex items-center gap-1 ${task.due_date ? "text-zinc-300" : "text-zinc-600 hover:text-zinc-400"}`}>
                  <Calendar className="w-3 h-3" />
                  {task.due_date ? task.due_date.slice(5) : "—"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 bg-zinc-800 border-zinc-700" onClick={stop}>
                <InlineInput defaultValue={task.due_date || ""} type="date" onUpdate={(v) => onUpdate(task.id, { due_date: v })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </Draggable>
  );
}