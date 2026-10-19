import { TMDB_API_KEY, TMDB_API_BASE } from "@/lib/tmdbConfig";

// In-memory cache with 7-day TTL (module-level, survives navigations within session)
const videoCache = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function getCached(key) {
  const entry = videoCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCached(key, data) {
  videoCache.set(key, { data, timestamp: Date.now() });
}

async function tmdbVideos(tmdbId, mediaType, language = "en-US") {
  const type = mediaType === "tv" || mediaType === "tv_show" ? "tv" : "movie";
  const url = new URL(`${TMDB_API_BASE}/${type}/${tmdbId}/videos`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  if (language) url.searchParams.set("language", language);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

// Rank: Official Trailer > Trailer > Teaser > Featurette/Clip > Behind the Scenes > Other
function rankVideos(videos) {
  const youtube = videos.filter((v) => v.site === "YouTube");
  const rank = (v) => {
    if (v.type === "Trailer" && v.official) return 0;
    if (v.type === "Trailer") return 1;
    if (v.type === "Teaser") return 2;
    if (v.type === "Featurette") return 3;
    if (v.type === "Clip") return 4;
    if (v.type === "Behind the Scenes") return 5;
    return 6;
  };
  return youtube.sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    return new Date(b.published_at || 0) - new Date(a.published_at || 0);
  });
}

// Fetch all available YouTube videos for a movie or TV show, with fallback to no-language query
export async function fetchTrailerVideos(tmdbId, mediaType) {
  if (!tmdbId) return { tmdbId, defaultVideoKey: null, videos: [] };

  const cacheKey = `tmdb:videos:${mediaType}:${tmdbId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let results = [];
  try {
    const data = await tmdbVideos(tmdbId, mediaType, "en-US");
    results = data.results || [];
  } catch {
    results = [];
  }

  // Fallback: query without language filter if sparse (< 2 YouTube entries)
  if (results.filter((v) => v.site === "YouTube").length < 2) {
    try {
      const fallback = await tmdbVideos(tmdbId, mediaType, "");
      const fallbackResults = fallback.results || [];
      const seen = new Set(results.map((v) => v.key));
      for (const v of fallbackResults) {
        if (!seen.has(v.key)) {
          results.push(v);
          seen.add(v.key);
        }
      }
    } catch {}
  }

  const ranked = rankVideos(results);
  const defaultVideo = ranked[0] || null;

  const payload = {
    tmdbId,
    defaultVideoKey: defaultVideo?.key || null,
    videos: ranked.map((v) => ({
      id: v.id,
      key: v.key,
      name: v.name,
      site: v.site,
      size: v.size,
      type: v.type,
      official: v.official,
      publishedAt: v.published_at,
    })),
  };

  setCached(cacheKey, payload);
  return payload;
}