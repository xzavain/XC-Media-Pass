import { Star, Film, Tv } from "lucide-react";
import PosterImage from "./PosterImage";
import NetworkBadge from "./NetworkBadge";

export default function TrendingCard({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer flex-shrink-0 w-[160px] sm:w-[180px] transition-transform hover:scale-105 hover:z-10"
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-lime-500/40 transition-colors">
        <PosterImage
          src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 flex gap-1">
          {item.content_rating && (
            <span className="bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/20">
              {item.content_rating}
            </span>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <span className="bg-black/80 backdrop-blur-sm text-lime-400 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-lime-500/30">
            <Star className="w-2.5 h-2.5 fill-lime-400" />
            {item.vote_average?.toFixed(1) || "N/A"}
          </span>
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2.5">
          <div className="flex items-center gap-1 mb-1">
            {item.media_type === "tv" ? (
              <Tv className="w-3 h-3 text-zinc-400" />
            ) : (
              <Film className="w-3 h-3 text-zinc-400" />
            )}
            <span className="text-[10px] text-zinc-400 uppercase tracking-wide">
              {item.media_type === "tv" ? "TV" : "Movie"} {item.release_year ? `• ${item.release_year}` : ""}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
        </div>
      </div>
      {(item.genres?.length > 0 || item.streaming_providers?.length > 0) && (
        <div className="mt-2 space-y-1">
          {item.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.genres.slice(0, 2).map((g) => (
                <span key={g} className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                  {g}
                </span>
              ))}
            </div>
          )}
          {item.streaming_providers?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.streaming_providers.slice(0, 3).map((p) => (
                <NetworkBadge key={p} provider={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}