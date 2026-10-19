import React from "react";
import ServerHealthCard from "./ServerHealthCard";
import { Loader2, ServerOff } from "lucide-react";

export default function ServerHealthGrid({ servers, alerts, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
      </div>
    );
  }
  if (servers.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <ServerOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No nodes are configured yet.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {servers.map((s) => (
        <ServerHealthCard key={s.id} server={s} alerts={alerts} />
      ))}
    </div>
  );
}