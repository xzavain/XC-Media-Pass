import { useState, useEffect } from "react";
import { fetchSeasonEpisodes, stillUrl } from "@/lib/mediaDiscoveryApi";
import { Loader2 } from "lucide-react";

export default function SeasonSelector({ tmdbId, title, seasons }) {
  const [selectedSeason, setSelectedSeason] = useState(seasons?.[0]?.season_number || 1);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tmdbId || !selectedSeason) return;
    setLoading(true);
    setEpisodes([]);
    fetchSeasonEpisodes(tmdbId, selectedSeason, title)
      .then((data) => setEpisodes(data || []))
      .catch(() => setEpisodes([]))
      .finally(() => setLoading(false));
  }, [tmdbId, selectedSeason, title]);

  if (!seasons || seasons.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Seasons & Episodes</h3>
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(Number(e.target.value))}
          className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
        >
          {seasons.map((s) => (
            <option key={s.season_number} value={s.season_number}>
              {s.name || `Season ${s.season_number}`} ({s.episode_count || 0} eps)
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
          <span className="text-sm text-zinc-500">Loading episodes...</span>
        </div>
      ) : episodes.length === 0 ? (
        <p className="text-sm text-zinc-500 py-4">No episode data available for this season.</p>
      ) : (
        <div className="space-y-2">
          {episodes.map((ep) => (
            <div
              key={ep.episode_number}
              className="flex gap-3 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex-shrink-0 w-[140px] sm:w-[160px] aspect-video rounded overflow-hidden bg-zinc-800">
                {ep.still_path ? (
                  <img
                    src={stillUrl(ep.still_path)}
                    alt={ep.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                    No image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-lime-400">E{ep.episode_number}</span>
                  <h4 className="text-sm font-semibold text-zinc-200 truncate">{ep.name}</h4>
                </div>
                {ep.air_date && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {ep.air_date}{ep.runtime ? ` • ${ep.runtime}m` : ""}
                  </p>
                )}
                {ep.overview && (
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{ep.overview}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}