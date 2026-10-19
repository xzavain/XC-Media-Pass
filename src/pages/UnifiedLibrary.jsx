import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Film, Tv, Loader2, AlertCircle, Server, Library, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UnifiedLibraryCard from "@/components/library/UnifiedLibraryCard";
import UnifiedLibraryDetail from "@/components/library/UnifiedLibraryDetail";
import { fetchUnifiedCatalog, deduplicateCatalog } from "@/lib/libraryCatalogApi";

const platformFilters = [
  { value: "all", label: "All Platforms" },
  { value: "plex", label: "Plex" },
  { value: "emby", label: "Emby" },
  { value: "jellyfin", label: "Jellyfin" },
];

const typeFilters = [
  { value: "all", label: "All Content" },
  { value: "movie", label: "Movies" },
  { value: "show", label: "TV Shows" },
];

const sortOptions = [
  { value: "title", label: "Title A–Z" },
  { value: "year_desc", label: "Newest First" },
  { value: "year_asc", label: "Oldest First" },
  { value: "rating", label: "Highest Rated" },
  { value: "servers", label: "Most Servers" },
];

export default function UnifiedLibrary() {
  const [rawItems, setRawItems] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("title");
  const [selectedItem, setSelectedItem] = useState(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const { items, errors: errs } = await fetchUnifiedCatalog();
      setRawItems(items);
      setErrors(errs);
    } catch (err) {
      setErrors([{ server: "Catalog", library: "all", error: err.message }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const catalog = useMemo(() => deduplicateCatalog(rawItems), [rawItems]);

  const filtered = useMemo(() => {
    let result = catalog;

    if (platformFilter !== "all") {
      result = result.filter((item) =>
        item.servers.some((s) => s.platform === platformFilter)
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((item) => item.content_type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.genres || []).some((g) => g.toLowerCase().includes(q))
      );
    }

    const sorted = [...result];
    switch (sortBy) {
      case "year_desc":
        sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
      case "year_asc":
        sorted.sort((a, b) => (a.year || 9999) - (b.year || 9999));
        break;
      case "rating":
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "servers":
        sorted.sort((a, b) => b.server_count - a.server_count);
        break;
      default:
        sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [catalog, platformFilter, typeFilter, search, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const movies = catalog.filter((i) => i.content_type === "movie").length;
    const shows = catalog.filter((i) => i.content_type === "show").length;
    const multiServer = catalog.filter((i) => i.server_count > 1).length;
    const serverSet = new Set();
    catalog.forEach((i) => i.servers.forEach((s) => serverSet.add(s.server_id)));
    return { total: catalog.length, movies, shows, multiServer, servers: serverSet.size };
  }, [catalog]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Library className="w-6 h-6 text-lime-400" />
            Unified Library
          </h1>
          <p className="text-sm text-white/50 mt-1">
            All movies and shows synced across Plex, Emby, and Jellyfin servers
          </p>
        </div>
        <Button variant="outline" onClick={loadCatalog} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Film} label="Total Items" value={stats.total} />
        <StatCard icon={Tv} label="TV Shows" value={stats.shows} />
        <StatCard icon={Server} label="Active Servers" value={stats.servers} />
        <StatCard icon={Server} label="Multi-Server" value={stats.multiServer} accent="text-indigo-400" />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-amber-400 font-medium">{errors.length} library error{errors.length > 1 ? "s" : ""} during sync</p>
            <ul className="text-white/60 mt-1 space-y-0.5">
              {errors.map((e, i) => (
                <li key={i}>{e.server} · {e.library}: {e.error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search titles or genres..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900/60 border-zinc-800 text-white placeholder:text-white/40"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[150px] bg-zinc-900/60 border-zinc-800 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
            {platformFilters.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] bg-zinc-900/60 border-zinc-800 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
            {typeFilters.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] bg-zinc-900/60 border-zinc-800 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
            {sortOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Library className="w-12 h-12 text-zinc-700 mb-3" />
          <p className="text-white/60 font-medium">No items found</p>
          <p className="text-sm text-white/40 mt-1">
            {catalog.length === 0
              ? "No media servers configured or all libraries are empty"
              : "Try adjusting your filters or search query"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((item) => (
            <UnifiedLibraryCard key={`${item.external_id}`} item={item} onClick={setSelectedItem} />
          ))}
        </div>
      )}

      <UnifiedLibraryDetail item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 flex items-center gap-3">
      <Icon className={`w-5 h-5 ${accent || "text-lime-400"}`} />
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/50">{label}</p>
      </div>
    </div>
  );
}