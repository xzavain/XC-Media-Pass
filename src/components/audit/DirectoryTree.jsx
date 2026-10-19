import React, { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, Loader2, HardDrive } from "lucide-react";

function TreeNode({ node, depth = 0, onNavigate, activePath }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggle = async (e) => {
    e.stopPropagation();
    if (!expanded && children.length === 0 && node.fetchChildren) {
      setLoading(true);
      try {
        const kids = await node.fetchChildren(node.path);
        setChildren(kids.filter((k) => k.isDirectory));
      } catch {}
      setLoading(false);
    }
    setExpanded((v) => !v);
  };

  const isActive = activePath === node.path;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 rounded cursor-pointer text-xs transition-colors select-none
          ${isActive ? "bg-violet-500/10 text-violet-300" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
        style={{ paddingLeft: `${8 + depth * 14}px`, paddingRight: "8px" }}
      >
        <button onClick={toggle} className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <button onClick={() => onNavigate(node.path, node.name)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
          {expanded ? <FolderOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /> : <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {expanded && children.map((child, i) => (
        <TreeNode key={i} node={{ ...child, fetchChildren: node.fetchChildren }} depth={depth + 1} onNavigate={onNavigate} activePath={activePath} />
      ))}
    </div>
  );
}

export default function DirectoryTree({ roots, fetchDir, activePath, onNavigate, onHome, homeLabel }) {
  return (
    <div className="flex-1 py-2 px-1 overflow-y-auto">
      <p className="text-xs text-zinc-600 uppercase tracking-wider px-2 mb-1.5 font-semibold">Directories</p>
      <button onClick={onHome} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 px-2 py-1.5 rounded w-full mb-1">
        <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
        <span>{homeLabel || "This Server"}</span>
      </button>
      {roots.map((root, i) => (
        <TreeNode key={i} node={{ ...root, fetchChildren: fetchDir }} activePath={activePath} onNavigate={onNavigate} />
      ))}
    </div>
  );
}