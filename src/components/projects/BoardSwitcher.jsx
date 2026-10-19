import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, Columns3, Users, Flag, ArrowUpDown, LayoutGrid } from "lucide-react";

const typeIcons = {
  status: Columns3,
  assignee: Users,
  milestone: Flag,
  priority: ArrowUpDown,
};

const typeColors = {
  status: "text-sky-400",
  assignee: "text-violet-400",
  milestone: "text-amber-400",
  priority: "text-emerald-400",
};

export default function BoardSwitcher({ boards, activeBoardId, onSelect, onCreate, onDelete }) {
  const active = boards.find((b) => b.id === activeBoardId);
  const ActiveIcon = active ? typeIcons[active.board_type] : LayoutGrid;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-zinc-800/60 border-zinc-700 text-zinc-200 gap-2">
            <ActiveIcon className={`w-4 h-4 ${active ? typeColors[active.board_type] : ""}`} />
            {active?.name || "Select Board"}
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-zinc-800 border-zinc-700 text-zinc-200 w-64">
          <DropdownMenuLabel className="text-zinc-400 text-xs uppercase tracking-wide">Boards</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-700" />
          {boards.length === 0 && (
            <div className="px-2 py-3 text-xs text-zinc-500">No boards yet. Create one below.</div>
          )}
          {boards.map((b) => {
            const Icon = typeIcons[b.board_type] || LayoutGrid;
            return (
              <div key={b.id} className="flex items-center group">
                <DropdownMenuItem
                  onClick={() => onSelect(b.id)}
                  className={`flex-1 cursor-pointer ${activeBoardId === b.id ? "bg-lime-500/10 text-lime-400" : ""}`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${typeColors[b.board_type]}`} />
                  <div className="flex flex-col">
                    <span>{b.name}</span>
                    <span className="text-xs text-zinc-500 capitalize">{b.board_type}</span>
                  </div>
                </DropdownMenuItem>
                {onDelete && b.board_type !== "status" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(b); }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 px-2 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          <DropdownMenuSeparator className="bg-zinc-700" />
          <DropdownMenuItem onClick={onCreate} className="cursor-pointer text-lime-400">
            <Plus className="w-4 h-4 mr-2" /> New Board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}