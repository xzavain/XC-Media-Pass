import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import KanbanCard from "@/components/projects/KanbanCard";

export default function KanbanColumn({ column, tasks, onAddTask, onTaskClick, onUpdate, staffList, accent }) {
  return (
    <div className="flex-shrink-0 w-72 flex flex-col bg-zinc-900/40 border border-zinc-800/60 rounded-xl max-h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          {accent && <span className={`w-2 h-2 rounded-full ${accent}`} />}
          <h3 className="text-sm font-semibold text-zinc-200">{column.name}</h3>
        </div>
        <span className="text-xs text-zinc-500 bg-zinc-800/60 rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px] ${snapshot.isDraggingOver ? "bg-zinc-800/30" : ""}`}
          >
            {tasks.map((task, index) => (
              <KanbanCard key={task.id} task={task} index={index} onClick={() => onTaskClick(task)} onUpdate={onUpdate} staffList={staffList} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <button
        onClick={() => onAddTask(column)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/40 border-t border-zinc-800/60"
      >
        <Plus className="w-3.5 h-3.5" /> Add task
      </button>
    </div>
  );
}