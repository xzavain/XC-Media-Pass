import React from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import KanbanColumn from "@/components/projects/KanbanColumn";

export default function KanbanBoard({ columns, tasksByColumn, onDragEnd, onAddTask, onTaskClick, onUpdate, staffList, accents }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex-1 flex gap-4 overflow-x-auto p-4 pb-8">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id] || []}
            onAddTask={onAddTask}
            onTaskClick={onTaskClick}
            onUpdate={onUpdate}
            staffList={staffList}
            accent={accents?.[column.id]}
          />
        ))}
      </div>
    </DragDropContext>
  );
}