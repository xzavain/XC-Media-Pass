import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import NetworkBadge from "./NetworkBadge";

export default function WhereToStreamBadges({ providers, tmdbId, mediaType }) {
  const { user } = useAuth();
  const syncPrefs = user?.sync_preferences || {};
  const [plexStatus, setPlexStatus] = useState("idle");
  const [embyStatus, setEmbyStatus] = useState("idle");

  const plexConfigured = syncPrefs.plex_enabled && syncPrefs.plex_token;
  const embyConfigured = syncPrefs.emby_enabled && syncPrefs.emby_host && syncPrefs.emby_token;
  const hasLocalConfig = plexConfigured || embyConfigured;

  useEffect(() => {
    if (!tmdbId || !hasLocalConfig) return;

    if (plexConfigured) {
      setPlexStatus("checking");
      checkPlex(syncPrefs.plex_token, tmdbId, mediaType)
        .then((r) => setPlexStatus(r.available ? "available" : "not_found"))
        .catch(() => setPlexStatus("error"));
    }

    if (embyConfigured) {
      setEmbyStatus("checking");
      checkEmby(syncPrefs.emby_host, syncPrefs.emby_token, tmdbId, mediaType)
        .then((r) => setEmbyStatus(r.available ? "available" : "not_found"))
        .catch(() => setEmbyStatus("error"));
    }
  }, [tmdbId, mediaType, plexConfigured, embyConfigured, syncPrefs.plex_token, syncPrefs.emby_host, syncPrefs.emby_token]);

  return (
    <div className="space-y-2">
      {/* Commercial providers */}
      {providers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-500">Where to stream:</span>
          {providers.map((p) => (
            <NetworkBadge key={p} provider={p} size="md" />
          ))}
        </div>
      )}

      {/* Local servers */}
      {hasLocalConfig && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-500">Local servers:</span>
          {plexConfigured && <ServerBadge name="Plex" platform="plex" status={plexStatus} />}
          {embyConfigured && <ServerBadge name="Emby" platform="emby" status={embyStatus} />}
        </div>
      )}

      {!hasLocalConfig && providers.length === 0 && (
        <p className="text-xs text-zinc-600">No streaming availability data.</p>
      )}
    </div>
  );
}

function ServerBadge({ name, platform, status }) {
  const color = platform === "plex" ? "#E5A00B" : "#52B840";

  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
        <Loader2 className="w-3 h-3 animate-spin" /> Checking {name}...
      </span>
    );
  }

  if (status === "available") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: `${color}30`, color }}>
        <Check className="w-3 h-3" /> Available on {name}
      </span>
    );
  }

  if (status === "not_found") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-zinc-800 text-zinc-500">
        <X className="w-3 h-3" /> Not on {name}
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-zinc-800 text-zinc-500" title="Connection failed — CORS or network error">
        <AlertCircle className="w-3 h-3" /> {name} offline
      </span>
    );
  }

  return null;
}

async function checkPlex(token, tmdbId, mediaType) {
  const res = await fetch(`https://plex.tv/api/v2/library/search?guid=tmdb://${tmdbId}`, {
    headers: { "X-Plex-Token": token, Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Plex API error");
  const data = await res.json();
  return { available: data?.MediaContainer?.Metadata?.length > 0 };
}

async function checkEmby(host, token, tmdbId, mediaType) {
  const base = host.replace(/\/$/, "");
  const res = await fetch(`${base}/Items?AnyProviderIdEquals=tmdb.${tmdbId}&Recursive=true&api_key=${token}`);
  if (!res.ok) throw new Error("Emby API error");
  const data = await res.json();
  return { available: data?.TotalRecordCount > 0 };
}