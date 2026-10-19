import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Search, Trash2, Bookmark, Star, ArrowUpDown } from "lucide-react";
import PosterImage from "@/components/discover/PosterImage";
import MediaDetailModal from "@/components/discover/MediaDetailModal";
import SyncDiagnosticsPanel from "@/components/watchlist/SyncDiagnosticsPanel";
import AutoSyncBanner from "@/components/watchlist/AutoSyncBanner";
import { useAutoSync } from "@/hooks/useAutoSync";
import { Button } from "@/components/ui/button";

export default function CustomerWatchlist() {
  const { user, checkUserAuth } = useAuth();
  const navigate = useNavigate();

  const [watchlist, setWatchlist] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("added");
  const [search, setSearch] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const { status: autoSyncStatus, lastSync: autoSyncLast, triggerSync } = useAutoSync();

  useEffect(() => {
    setWatchlist(user?.watchlist || []);
  }, [user]);

  const filtered = useMemo(() => {
    let items = [...watchlist];

    if (filter === "movies") items = items.filter((i) => i.media_type === "movie");
    else if (filter === "tv") items = items.filter((i) => i.media_type === "tv");
    else if (filter === "unwatched") items = items.filter((i) => (i.status || "plan_to_watch") !== "completed");
    else if (filter === "in_progress") items = items.filter((i) => i.status === "watching");

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.title?.toLowerCase().includes(q));
    }

    if (sort === "added") items.sort((a, b) => new Date(b.added_at || 0) - new Date(a.added_at || 0));
    else if (sort === "release") items.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
    else if (sort === "title") items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (sort === "rating") items.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

    return items;
  }, [watchlist, filter, sort, search]);

  const persistWatchlist = async (updated) => {
    setWatchlist(updated);
    try {
      await base44.auth.updateMe({ watchlist: updated });
      checkUserAuth();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = (item) => {
    persistWatchlist(
      watchlist.filter((w) => !(w.tmdb_id === item.tmdb_id && w.media_type === item.media_type))
    );
  };

  const handleStatusChange = (item, newStatus) => {
    persistWatchlist(
      watchlist.map((w) =>
        w.tmdb_id === item.tmdb_id && w.media_type === item.media_type
          ? { ...w, status: newStatus }
          : w
      )
    );
  };

  const handleCardClick = (item) => {
    setSelectedMedia(item);
    setShowDetail(true);
  };

  const handleToggleWatchlist = (item) => {
    handleRemove(item);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-lime-400 fill-lime-400" /> My Watchlist
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {watchlist.length} {watchlist.length === 1 ? "title" : "titles"} saved
        </p>
      </div>

      {/* Auto-sync status banner */}
      <AutoSyncBanner status={autoSyncStatus} lastSync={autoSyncLast} onManualSync={triggerSync} />

      {/* Sync Diagnostics */}
      <SyncDiagnosticsPanel onSyncComplete={() => {}} />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your watchlist..."
          className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-200 text-sm rounded-lg pl-10 pr-4 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-lime-500/40"
        />
      </div>

      {/* Filter tabs + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: "all", label: "All" },
            { id: "movies", label: "Movies" },
            { id: "tv", label: "TV Shows" },
            { id: "unwatched", label: "Unwatched" },
            { id: "in_progress", label: "In Progress" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.id
                  ? "bg-lime-500/10 text-lime-400 border border-lime-500/20"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-zinc-500" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
          >
            <option value="added">Recently Added</option>
            <option value="release">Release Date</option>
            <option value="title">Title (A-Z)</option>
            <option value="rating">IMDb Rating</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <Bookmark className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">
            {search ? "No results found" : "Your watchlist is empty"}
          </p>
          {!search && (
            <Button
              onClick={() => navigate("/customer/discover")}
              variant="outline"
              className="border-zinc-700 text-zinc-300 mt-4"
            >
              Discover Content
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div key={`${item.tmdb_id}-${item.media_type}`} className="group relative">
              <div
                onClick={() => handleCardClick(item)}
                className="cursor-pointer aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-lime-500/40 transition-colors"
              >
                <PosterImage
                  src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(item); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Info */}
              <div className="mt-2 space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200 truncate">{item.title}</h3>
                <div className="flex items-center gap-2">
                  {item.release_year && <span className="text-xs text-zinc-500">{item.release_year}</span>}
                  {item.vote_average > 0 && (
                    <span className="text-xs text-lime-400 flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-lime-400" />
                      {item.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
                {/* Status selector */}
                <select
                  value={item.status || "plan_to_watch"}
                  onChange={(e) => { e.stopPropagation(); handleStatusChange(item, e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-1.5 py-0.5 w-full"
                >
                  <option value="plan_to_watch">Plan to Watch</option>
                  <option value="watching">Watching</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <MediaDetailModal
        item={selectedMedia}
        open={showDetail}
        onOpenChange={setShowDetail}
        watchlist={watchlist}
        onToggleWatchlist={handleToggleWatchlist}
        onItemChange={(newItem) => setSelectedMedia(newItem)}
      />
    </div>
  );
}