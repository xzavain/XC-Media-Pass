import { Check, Play } from "lucide-react";

export default function WatchStatusBadge({ status, watchedEpisodes, totalEpisodes }) {
  if (!status || status === "unwatched" || status === "plan_to_watch") return null;

  if (status === "completed" || status === "watched") {
    return (
      <div className="inline-flex items-center gap-1 bg-lime-500/20 text-lime-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
        <Check className="w-3 h-3" /> Watched
      </div>
    );
  }

  if (status === "watching" || status === "in_progress") {
    const label = totalEpisodes ? `${watchedEpisodes || 0}/${totalEpisodes} Eps` : "In Progress";
    return (
      <div className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
        <Play className="w-3 h-3" /> {label}
      </div>
    );
  }

  return null;
}