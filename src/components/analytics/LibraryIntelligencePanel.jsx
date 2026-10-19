import React from "react";
import LibraryStatCard from "@/components/analytics/LibraryStatCard";

export default function LibraryIntelligencePanel({ servers, statsMap, snapshots }) {
  const cards = servers.flatMap((server) =>
    (server.libraries || []).map((library) => {
      const key = `${server.id}:${library.id}`;
      const stats = statsMap[key];
      // Closest snapshot to 7 days ago (but older than 5 days) as the growth baseline
      const libSnapshots = snapshots
        .filter((s) => s.server_id === server.id && s.library_id === library.id)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
      const baselineSnapshot = libSnapshots.find((s) => new Date(s.created_date).getTime() <= fiveDaysAgo) || null;

      return { key, server, library, stats, baselineSnapshot };
    })
  );

  if (cards.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-200 mb-3">Library Intelligence</h2>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((c) => (
          <LibraryStatCard key={c.key} server={c.server} library={c.library} stats={c.stats} baselineSnapshot={c.baselineSnapshot} />
        ))}
      </div>
    </div>
  );
}