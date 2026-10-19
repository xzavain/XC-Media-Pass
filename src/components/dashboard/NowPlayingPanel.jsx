import React, { useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import GroupedSessions from "@/components/sessions/GroupedSessions";
import BulkKillDialog from "@/components/sessions/BulkKillDialog";

export default function NowPlayingPanel({ sessions, serversById, onKilled }) {
  const [selected, setSelected] = useState(new Map()); // key -> { session, server }
  const [bulkOpen, setBulkOpen] = useState(false);

  const toggleSelect = (key, session, server) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, { session, server });
      return next;
    });
  };

  const handleKilled = () => {
    setSelected(new Map());
    onKilled?.();
  };

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-zinc-800/50 border border-zinc-700/60 rounded-lg px-4 py-2.5">
          <span className="text-sm text-zinc-300">{selected.size} stream{selected.size !== 1 ? "s" : ""} selected</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Map())} className="text-zinc-400 hover:text-zinc-200">
              Clear
            </Button>
            <Button size="sm" onClick={() => setBulkOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
              <Ban className="w-3.5 h-3.5" /> Stop Selected
            </Button>
          </div>
        </div>
      )}

      <GroupedSessions
        sessions={sessions}
        serversById={serversById}
        onKilled={handleKilled}
        emptyMessage="No active streams right now"
        gridClassName="xl:grid-cols-2"
        selectable
        selectedKeys={new Set(selected.keys())}
        onToggleSelect={toggleSelect}
      />

      <BulkKillDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        items={Array.from(selected.values()).filter((i) => i.server)}
        onKilled={handleKilled}
      />
    </div>
  );
}