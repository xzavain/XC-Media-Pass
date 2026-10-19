import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Sparkles, Filter, Bookmark, TrendingUp, Film, Tv, Star, RefreshCw, HelpCircle, X, CheckCircle2 } from "lucide-react";
import { FEED_KEYS, getCachedFeed, fetchFeedByKey, isFeedCacheFresh, clearDiscoverFeedsCache } from "@/lib/mediaDiscoveryApi";
import { filterTrendingByNetworks, getNetworkById } from "@/lib/streamingNetworks";
import TrendingCarousel from "@/components/discover/TrendingCarousel";
import NetworkPickerModal from "@/components/discover/NetworkPickerModal";
import MediaDetailModal from "@/components/discover/MediaDetailModal";
import FilterBar from "@/components/discover/FilterBar";
import SyncSettingsModal from "@/components/discover/SyncSettingsModal";
import OnboardingModal from "@/components/discover/OnboardingModal";
import { Button } from "@/components/ui/button";

export default function CustomerDiscover() {
  const { user, checkUserAuth } = useAuth();

  const [feeds, setFeeds] = useState({ top_movies: [], top_tv: [], recently_released: [], critically_acclaimed: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(
    () => localStorage.getItem("discover_onboarding_dismissed") !== "true"
  );
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [networks, setNetworks] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [syncPrefs, setSyncPrefs] = useState({});
  const [filters, setFilters] = useState({ genre: "", minScore: 0, year: "" });

  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;

  useEffect(() => {
    setNetworks(user?.media_networks || []);
    setWatchlist(user?.watchlist || []);
    setSyncPrefs(user?.sync_preferences || {});
  }, [user]);

  const loadFeeds = useCallback(async (skipCache = false) => {
    if (skipCache) clearDiscoverFeedsCache();

    // 1. Stale-while-revalidate: show cached data instantly
    const cachedFeeds = {};
    let hasCached = false;
    for (const key of FEED_KEYS) {
      const cached = getCachedFeed(key);
      if (cached?.data?.length > 0) {
        cachedFeeds[key] = cached.data;
        hasCached = true;
      }
    }
    if (hasCached) {
      setFeeds((prev) => ({ ...prev, ...cachedFeeds }));
      setLoading(false);
    }

    // 2. Only fetch feeds that are stale or missing
    const feedsToFetch = skipCache ? FEED_KEYS : FEED_KEYS.filter((key) => !isFeedCacheFresh(key));

    if (feedsToFetch.length === 0) {
      setLastUpdated(new Date());
      setRefreshing(false);
      return;
    }

    // Show full loading spinner only if we have nothing to display yet
    const hasExistingData = feedsRef.current.top_movies.length > 0 || feedsRef.current.top_tv.length > 0;
    if (!hasCached && !hasExistingData) setLoading(true);
    setRefreshing(true);

    // 3. Fetch each feed independently — state updates as each completes
    let firstLoaded = hasCached || hasExistingData;
    await Promise.allSettled(
      feedsToFetch.map(async (key) => {
        try {
          const items = await fetchFeedByKey(key, (feedKey, enrichedItems) => {
            setFeeds((prev) => ({ ...prev, [feedKey]: enrichedItems }));
          });
          setFeeds((prev) => ({ ...prev, [key]: items }));
          if (!firstLoaded) {
            firstLoaded = true;
            setLoading(false); // Hide spinner as soon as first feed arrives
          }
        } catch (err) {
          console.error(`Failed to load feed ${key}:`, err);
        }
      })
    );

    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const handleSaveNetworks = async (selected) => {
    setNetworks(selected);
    try {
      await base44.auth.updateMe({ media_networks: selected });
      checkUserAuth();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSyncPrefs = async (prefs) => {
    setSyncPrefs(prefs);
    try {
      await base44.auth.updateMe({ sync_preferences: prefs });
      checkUserAuth();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleWatchlist = async (item) => {
    const existing = watchlist.find(
      (w) => w.tmdb_id === item.tmdb_id && w.media_type === item.media_type
    );
    let updated;
    if (existing) {
      updated = watchlist.filter(
        (w) => !(w.tmdb_id === item.tmdb_id && w.media_type === item.media_type)
      );
    } else {
      updated = [
        ...watchlist,
        {
          tmdb_id: item.tmdb_id,
          media_type: item.media_type,
          title: item.title,
          poster_path: item.poster_path,
          added_at: new Date().toISOString(),
          status: "plan_to_watch",
          vote_average: item.vote_average || 0,
          release_year: item.release_year || null,
          genres: item.genres || [],
        },
      ];
    }
    setWatchlist(updated);
    try {
      await base44.auth.updateMe({ watchlist: updated });
      checkUserAuth();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCardClick = (item) => {
    setSelectedMedia(item);
    setShowDetail(true);
  };

  const dismissBanner = () => {
    localStorage.setItem("discover_onboarding_dismissed", "true");
    setShowOnboardingBanner(false);
  };

  const applyFilters = (items) => {
    if (!items) return [];
    return items.filter((item) => {
      if (filters.genre && !(item.genres || []).some((g) => g.toLowerCase().includes(filters.genre.toLowerCase()))) return false;
      if (filters.minScore > 0 && (item.vote_average || 0) < filters.minScore) return false;
      if (filters.year) {
        if (filters.year === "older") {
          if ((item.release_year || 9999) >= 2022) return false;
        } else if ((item.release_year || 0) !== Number(filters.year)) return false;
      }
      return true;
    });
  };

  const allItems = [...feeds.top_movies, ...feeds.top_tv];
  const trendingOnYourServices = filterTrendingByNetworks(allItems, networks);
  const hasActiveFilters = filters.genre || filters.minScore > 0 || filters.year;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-lime-400" /> Discover
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Trending movies & shows, tailored to your streaming services
            {lastUpdated && <span className="ml-1">• Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => loadFeeds(true)}
            variant="outline"
            className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 gap-1.5"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            onClick={() => setShowSyncSettings(true)}
            variant="outline"
            className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Sync Settings
            {(syncPrefs.plex_enabled || syncPrefs.emby_enabled) && (
              <span className="ml-1 bg-lime-500/20 text-lime-400 text-xs px-1.5 py-0.5 rounded-full">
                Active
              </span>
            )}
          </Button>
          <Button
            onClick={() => setShowNetworkPicker(true)}
            variant="outline"
            className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 gap-1.5"
          >
            <Filter className="w-4 h-4" />
            My Services
            {networks.length > 0 && (
              <span className="ml-1 bg-lime-500/20 text-lime-400 text-xs px-1.5 py-0.5 rounded-full">
                {networks.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Onboarding banner */}
      {showOnboardingBanner && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-lime-500/10 to-emerald-500/10 border border-lime-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-lime-500/20 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-lime-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Watchlist Sync is here!</p>
              <p className="text-xs text-zinc-400">Connect Plex & Emby to sync your watchlist automatically.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowOnboarding(true)} variant="outline" className="border-lime-500/30 text-lime-400 hover:bg-lime-500/10 text-xs">
              Learn How
            </Button>
            <button onClick={dismissBanner} className="text-zinc-500 hover:text-zinc-300 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Network preferences summary */}
      {networks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">Your services:</span>
          {networks.slice(0, 8).map((id) => {
            const n = getNetworkById(id);
            if (!n) return null;
            return (
              <span
                key={id}
                className="text-xs font-semibold px-2 py-1 rounded"
                style={{ backgroundColor: n.color, color: n.textColor }}
              >
                {n.name}
              </span>
            );
          })}
          {networks.length > 8 && <span className="text-xs text-zinc-500">+{networks.length - 8} more</span>}
        </div>
      )}

      {/* Filter bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
          <span className="ml-2 text-sm text-zinc-500">Loading trending content...</span>
        </div>
      )}

      {/* Feeds */}
      {!loading && (
        <div className="space-y-8">
          {/* Trending on your services */}
          {!hasActiveFilters && networks.length > 0 && trendingOnYourServices.length > 0 && (
            <FeedSection
              icon={<TrendingUp className="w-5 h-5 text-lime-400" />}
              title="Trending On Your Services"
              items={trendingOnYourServices}
              onCardClick={handleCardClick}
            />
          )}

          {/* Top movies */}
          <FeedSection
            icon={<Film className="w-5 h-5 text-lime-400" />}
            title="Top Movies This Week"
            items={applyFilters(feeds.top_movies)}
            onCardClick={handleCardClick}
          />

          {/* Top TV */}
          <FeedSection
            icon={<Tv className="w-5 h-5 text-lime-400" />}
            title="Top TV Shows This Week"
            items={applyFilters(feeds.top_tv)}
            onCardClick={handleCardClick}
          />

          {/* Recently released */}
          {!hasActiveFilters && feeds.recently_released.length > 0 && (
            <FeedSection
              icon={<Star className="w-5 h-5 text-lime-400" />}
              title="Popular In Theaters / Recently Released"
              items={feeds.recently_released}
              onCardClick={handleCardClick}
            />
          )}

          {/* Critically acclaimed */}
          {!hasActiveFilters && feeds.critically_acclaimed.length > 0 && (
            <FeedSection
              icon={<Star className="w-5 h-5 text-lime-400 fill-lime-400" />}
              title="Critically Acclaimed"
              items={feeds.critically_acclaimed}
              onCardClick={handleCardClick}
            />
          )}

          {/* Empty state */}
          {feeds.top_movies.length === 0 && feeds.top_tv.length === 0 && (
            <div className="text-center py-24">
              <p className="text-zinc-500 text-sm">No trending content available right now. Check back later.</p>
              <Button onClick={() => loadFeeds(true)} variant="outline" className="border-zinc-700 text-zinc-300 mt-4">
                Try Again
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Watchlist preview */}
      {watchlist.length > 0 && !hasActiveFilters && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-lime-400 fill-lime-400" />
              My Watchlist ({watchlist.length})
            </h2>
            <Link to="/customer/watchlist" className="text-xs text-lime-400 hover:text-lime-300">
              View All →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {watchlist.slice(0, 10).map((item) => (
              <div
                key={`${item.tmdb_id}-${item.media_type}`}
                onClick={() => handleCardClick(item)}
                className="group cursor-pointer flex-shrink-0 w-[140px]"
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-lime-500/40 transition-colors">
                  {item.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs p-2 text-center">
                      {item.title}
                    </div>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 truncate">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <NetworkPickerModal
        open={showNetworkPicker}
        onOpenChange={setShowNetworkPicker}
        selected={networks}
        onSave={handleSaveNetworks}
      />
      <SyncSettingsModal
        open={showSyncSettings}
        onOpenChange={setShowSyncSettings}
        preferences={syncPrefs}
        onSave={handleSaveSyncPrefs}
      />
      <OnboardingModal open={showOnboarding} onOpenChange={setShowOnboarding} />
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

function FeedSection({ icon, title, items, onCardClick }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">{icon}{title}</h2>
      <TrendingCarousel items={items} onCardClick={onCardClick} />
    </div>
  );
}