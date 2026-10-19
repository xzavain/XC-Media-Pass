import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useMediaAuth } from "@/lib/MediaAuthContext";
import { Loader2 } from "lucide-react";
import ReleaseHero from "@/components/releases/ReleaseHero";
import ReleaseFilterBar from "@/components/releases/ReleaseFilterBar";
import ReleaseCalendar from "@/components/releases/ReleaseCalendar";
import ReleaseTimeline from "@/components/releases/ReleaseTimeline";
import ReleaseDetailModal from "@/components/releases/ReleaseDetailModal";
import PersonProfileDrawer from "@/components/releases/PersonProfileDrawer";
import { fetchTmdbDetails, ingestUpcomingReleases } from "@/lib/releaseApi";
import { dispatchWatchlistSync } from "@/lib/watchlistSync";
import { useToast } from "@/components/ui/use-toast";
import { useTrailerModal } from "@/hooks/useTrailerModal.jsx";

export default function CustomerReleases() {
  const { user } = useAuth();
  const { accounts } = useMediaAuth();
  const { toast } = useToast();
  const { openTrailer, modal: trailerModal } = useTrailerModal();
  const [releases, setReleases] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [notifPrefs, setNotifPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [view, setView] = useState("timeline");
  const [stage, setStage] = useState("all");
  const [server, setServer] = useState("all");
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const watchlistIds = watchlist.map((w) => w.media_release_id);
  const watchlistMap = Object.fromEntries(watchlist.map((w) => [w.media_release_id, w]));

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [rels, wl, prefs] = await Promise.all([
      base44.entities.MediaRelease.list("-digital_vod_release_date", 200),
      base44.entities.UserWatchlist.filter({ user_id: user.id }),
      base44.entities.NotificationPreference.filter({ user_id: user.id }),
    ]);

    let releaseData = rels;
    if (rels.length === 0) {
      setIngesting(true);
      try {
        releaseData = await ingestUpcomingReleases();
      } catch {
        releaseData = [];
      } finally { setIngesting(false); }
    }

    setReleases(releaseData);
    setWatchlist(wl);
    setNotifPrefs(prefs[0] || null);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = releases.filter((r) => {
    if (server !== "all" && !r.target_servers?.includes(server)) return false;
    if (stage === "vod" && !r.digital_vod_release_date) return false;
    if (stage === "theatrical" && !r.theatrical_release_date) return false;
    if (stage === "imported" && r.server_import_status !== "imported_live") return false;
    return true;
  });

  const handleToggleWatchlist = async (release) => {
    const existing = watchlist.find((w) => w.media_release_id === release.id);
    if (existing) {
      await base44.entities.UserWatchlist.delete(existing.id);
      setWatchlist((prev) => prev.filter((w) => w.id !== existing.id));
    } else {
      const item = await base44.entities.UserWatchlist.create({
        user_id: user.id,
        media_release_id: release.id,
        notify_digital_vod: true,
        notify_server_import: true,
        sync_plex: true, sync_emby: true, sync_jellyfin: true,
      });
      setWatchlist((prev) => [...prev, item]);
      // Dispatch cross-platform sync using globally propagated credentials — zero friction
      dispatchWatchlistSync(item, release, accounts).then(() => {
        toast({ title: "Watchlist synced across your linked servers" });
      }).catch(() => {});
    }
  };

  const handleTmdbSelect = async (result) => {
    const existing = releases.find((r) => r.tmdb_id === result.id);
    if (existing) {
      setSelectedRelease(existing);
    } else {
      const details = await fetchTmdbDetails(result.id, result.media_type === "tv_show" ? "tv" : "movie");
      setSelectedRelease({
        id: null,
        tmdb_id: details.tmdb_id,
        media_type: details.media_type,
        title: details.title,
        tagline: details.tagline,
        overview: details.overview,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        genres: details.genres,
        runtime_minutes: details.runtime_minutes,
        certification: details.certification,
        trailer_youtube_key: details.trailer_youtube_key,
        vote_average: details.vote_average,
        notTracked: true,
      });
    }
  };

  const handleUpdateWatchlistPrefs = async (field, value) => {
    const item = watchlist.find((w) => w.media_release_id === selectedRelease?.id);
    if (!item) return;
    const updated = await base44.entities.UserWatchlist.update(item.id, { [field]: value });
    setWatchlist((prev) => prev.map((w) => (w.id === item.id ? updated : w)));
  };

  const handleUpdateNotifPrefs = async (field, value) => {
    let prefs = notifPrefs;
    if (!prefs) {
      prefs = await base44.entities.NotificationPreference.create({ user_id: user.id, user_email: user.email, [field]: value });
    } else {
      prefs = await base44.entities.NotificationPreference.update(prefs.id, { [field]: value });
    }
    setNotifPrefs(prefs);
  };

  const handleWatchTrailer = (release) => {
    openTrailer({ tmdbId: release.tmdb_id, mediaType: release.media_type, title: release.title });
  };

  const handleSelectPerson = (person) => {
    setSelectedPerson(person);
  };

  const handleSelectReleaseFromPerson = (release) => {
    setSelectedPerson(null);
    handleTmdbSelect({ id: release.tmdb_id, media_type: release.media_type });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">Coming Soon & Release Calendar</h1>
        <p className="text-sm text-slate-500 mt-1">Track upcoming releases across theatrical, digital VOD, and server imports</p>
      </div>

      {ingesting && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-xs text-indigo-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting live release data from TMDB...
        </div>
      )}

      <ReleaseHero releases={releases} onAddToWatchlist={handleToggleWatchlist} onSelectRelease={setSelectedRelease} watchlistIds={watchlistIds} />

      <ReleaseFilterBar
        view={view}
        onViewChange={setView}
        stage={stage}
        onStageChange={setStage}
        server={server}
        onServerChange={setServer}
        onTmdbSelect={handleTmdbSelect}
      />

      {view === "calendar" && <ReleaseCalendar releases={filtered} onSelectRelease={setSelectedRelease} />}
      {view === "timeline" && (
        <ReleaseTimeline
          releases={filtered}
          watchlistIds={watchlistIds}
          onToggleWatchlist={handleToggleWatchlist}
          onSelectRelease={setSelectedRelease}
          onWatchTrailer={handleWatchTrailer}
        />
      )}

      <ReleaseDetailModal
        release={selectedRelease}
        open={!!selectedRelease}
        onOpenChange={(v) => !v && setSelectedRelease(null)}
        isBookmarked={selectedRelease ? watchlistIds.includes(selectedRelease.id) : false}
        onToggleWatchlist={handleToggleWatchlist}
        watchlistItem={selectedRelease ? watchlistMap[selectedRelease.id] : null}
        onUpdateWatchlistPrefs={handleUpdateWatchlistPrefs}
        notifPrefs={notifPrefs}
        onUpdateNotifPrefs={handleUpdateNotifPrefs}
        onSelectPerson={handleSelectPerson}
      />

      <PersonProfileDrawer
        person={selectedPerson}
        open={!!selectedPerson}
        onOpenChange={(v) => !v && setSelectedPerson(null)}
        onSelectRelease={handleSelectReleaseFromPerson}
        watchlistIds={watchlistIds}
        onToggleWatchlist={handleToggleWatchlist}
      />
      {trailerModal}
    </div>
  );
}