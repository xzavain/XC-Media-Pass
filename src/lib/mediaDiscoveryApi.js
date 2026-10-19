import { TMDB_API_KEY, TMDB_API_BASE } from "@/lib/tmdbConfig";

const TMDB_IMG_BASE = "https://image.tmdb.org/t/p";

// ---- Image URL helpers ----
export function posterUrl(path, size = "w500") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}

export function backdropUrl(path, size = "w1280") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}

export function profileUrl(path, size = "w200") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}

export function stillUrl(path, size = "w300") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}

// ---- TMDB API helper ----
async function tmdbGet(endpoint, params = {}) {
  const url = new URL(`${TMDB_API_BASE}${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", "en-US");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

// ---- Genre mapping (cached permanently) ----
let movieGenreMap = null;
let tvGenreMap = null;
let movieGenrePromise = null;
let tvGenrePromise = null;

function getMovieGenres() {
  if (movieGenreMap) return Promise.resolve(movieGenreMap);
  if (movieGenrePromise) return movieGenrePromise;
  movieGenrePromise = (async () => {
    try {
      const cached = localStorage.getItem("tmdb_movie_genres");
      if (cached) {
        movieGenreMap = JSON.parse(cached);
        return movieGenreMap;
      }
    } catch {}
    const data = await tmdbGet("/genre/movie/list");
    movieGenreMap = {};
    data.genres.forEach((g) => (movieGenreMap[g.id] = g.name));
    try { localStorage.setItem("tmdb_movie_genres", JSON.stringify(movieGenreMap)); } catch {}
    return movieGenreMap;
  })();
  return movieGenrePromise;
}

function getTvGenres() {
  if (tvGenreMap) return Promise.resolve(tvGenreMap);
  if (tvGenrePromise) return tvGenrePromise;
  tvGenrePromise = (async () => {
    try {
      const cached = localStorage.getItem("tmdb_tv_genres");
      if (cached) {
        tvGenreMap = JSON.parse(cached);
        return tvGenreMap;
      }
    } catch {}
    const data = await tmdbGet("/genre/tv/list");
    tvGenreMap = {};
    data.genres.forEach((g) => (tvGenreMap[g.id] = g.name));
    try { localStorage.setItem("tmdb_tv_genres", JSON.stringify(tvGenreMap)); } catch {}
    return tvGenreMap;
  })();
  return tvGenrePromise;
}

function mapGenreIds(genreIds, genreMap) {
  if (!genreIds || !genreMap) return [];
  return genreIds.map((id) => genreMap[id]).filter(Boolean);
}

// ---- Watch providers ----
async function fetchWatchProviders(tmdbId, mediaType) {
  try {
    const endpoint = mediaType === "tv" ? `/tv/${tmdbId}/watch/providers` : `/movie/${tmdbId}/watch/providers`;
    const data = await tmdbGet(endpoint);
    const us = data?.results?.US;
    if (!us) return [];
    const names = new Set();
    (us.flatrate || []).forEach((p) => names.add(p.provider_name));
    (us.rent || []).forEach((p) => names.add(p.provider_name));
    (us.buy || []).forEach((p) => names.add(p.provider_name));
    return Array.from(names);
  } catch {
    return [];
  }
}

// ---- Feed item mapping ----
function mapToFeedItem(item, mediaType, genreMap) {
  const isMovie = mediaType === "movie";
  const dateStr = isMovie ? item.release_date : item.first_air_date;
  return {
    tmdb_id: item.id,
    media_type: mediaType,
    title: isMovie ? item.title : item.name,
    poster_path: item.poster_path,
    release_year: dateStr ? parseInt(dateStr.substring(0, 4)) : null,
    vote_average: item.vote_average || 0,
    overview: item.overview || "",
    genres: mapGenreIds(item.genre_ids, genreMap),
    content_rating: null,
    streaming_providers: [],
  };
}

// ---- Caching ----
const FEED_CACHE_PREFIX = "discover_feed_v5_";
const DETAIL_CACHE_PREFIX = "discover_detail_v3_";
const EPISODES_CACHE_PREFIX = "discover_episodes_v3_";
const CACHE_FEEDS_TTL = 6 * 60 * 60 * 1000;
const CACHE_DETAIL_TTL = 7 * 24 * 60 * 60 * 1000;

export const FEED_KEYS = ["top_movies", "top_tv", "recently_released", "critically_acclaimed"];

// ---- Feed endpoints ----
async function fetchFeedEndpoint(feedKey) {
  switch (feedKey) {
    case "top_movies":
      return { data: await tmdbGet("/trending/movie/week"), mediaType: "movie" };
    case "top_tv":
      return { data: await tmdbGet("/trending/tv/week"), mediaType: "tv" };
    case "recently_released":
      return { data: await tmdbGet("/movie/now_playing", { region: "US" }), mediaType: "movie" };
    case "critically_acclaimed":
      return { data: await tmdbGet("/movie/top_rated"), mediaType: "movie" };
    default:
      return { data: { results: [] }, mediaType: "movie" };
  }
}

// ---- Per-feed caching (stale-while-revalidate) ----

export function getCachedFeed(feedKey) {
  try {
    const raw = localStorage.getItem(`${FEED_CACHE_PREFIX}${feedKey}`);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      return { data, timestamp };
    }
  } catch {}
  return null;
}

export function isFeedCacheFresh(feedKey) {
  const cached = getCachedFeed(feedKey);
  return !!cached && Date.now() - cached.timestamp < CACHE_FEEDS_TTL;
}

export async function fetchFeedByKey(feedKey, onProvidersLoaded) {
  try {
    // Fetch feed data and genre map in parallel
    const isTv = feedKey === "top_tv";
    const [feedResult, genreMap] = await Promise.all([
      fetchFeedEndpoint(feedKey),
      isTv ? getTvGenres() : getMovieGenres(),
    ]);
    const { data, mediaType } = feedResult;
    const results = (data.results || []).slice(0, 6);
    const items = results.map((r) => mapToFeedItem(r, mediaType, genreMap));

    // Fetch watch providers in the BACKGROUND — don't block the return
    // This lets the feed display immediately; badges appear progressively
    Promise.all(
      items.map(async (item, i) => {
        const providers = await fetchWatchProviders(item.tmdb_id, mediaType);
        return { index: i, providers };
      })
    ).then((providerResults) => {
      providerResults.forEach(({ index, providers }) => {
        items[index].streaming_providers = providers;
      });
      try {
        localStorage.setItem(
          `${FEED_CACHE_PREFIX}${feedKey}`,
          JSON.stringify({ data: items, timestamp: Date.now() })
        );
      } catch {}
      onProvidersLoaded?.(feedKey, items.map((i) => ({ ...i })));
    });

    return items;
  } catch (err) {
    console.error(`Failed to load feed ${feedKey}:`, err);
    return [];
  }
}

export function clearDiscoverFeedsCache() {
  FEED_KEYS.forEach((key) => localStorage.removeItem(`${FEED_CACHE_PREFIX}${key}`));
  // Clear old version caches
  ["v4", "v3", "v2", ""].forEach((v) => {
    FEED_KEYS.forEach((key) => localStorage.removeItem(`discover_feed_${v}_${key}`));
  });
  localStorage.removeItem("discover_feeds_v3_cache");
  localStorage.removeItem("discover_feeds_v2_cache");
  localStorage.removeItem("discover_feeds_cache");
}

export async function fetchDiscoverFeeds() {
  const entries = await Promise.all(
    FEED_KEYS.map(async (key) => [key, await fetchFeedByKey(key)])
  );
  return Object.fromEntries(entries);
}

// ---- Detail ----
export async function fetchMediaDetail(tmdbId, mediaType, title) {
  const cacheKey = `${DETAIL_CACHE_PREFIX}${mediaType}_${tmdbId}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DETAIL_TTL) return data;
    }
  } catch {}

  const isMovie = mediaType === "movie";
  const endpoint = isMovie
    ? `/movie/${tmdbId}?append_to_response=credits,videos,release_dates,watch/providers,similar`
    : `/tv/${tmdbId}?append_to_response=credits,videos,content_ratings,watch/providers,similar`;

  try {
    const data = await tmdbGet(endpoint);

    // Content rating
    let contentRating = null;
    if (isMovie) {
      const usRelease = data.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
      contentRating = usRelease?.release_dates?.[0]?.certification || null;
    } else {
      const usRating = data.content_ratings?.results?.find((r) => r.iso_3166_1 === "US");
      contentRating = usRating?.rating || null;
    }

    // Streaming providers
    const usProviders = data["watch/providers"]?.results?.US;
    const providerNames = new Set();
    (usProviders?.flatrate || []).forEach((p) => providerNames.add(p.provider_name));
    (usProviders?.rent || []).forEach((p) => providerNames.add(p.provider_name));
    (usProviders?.buy || []).forEach((p) => providerNames.add(p.provider_name));

    // Trailer
    const trailer = data.videos?.results?.find(
      (v) => v.type === "Trailer" && v.site === "YouTube" && v.official
    ) || data.videos?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube");

    // Cast
    const cast = (data.credits?.cast || []).slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile_path: c.profile_path,
      order: c.order,
    }));

    // Directors / creators
    let directors = [];
    if (isMovie) {
      directors = (data.credits?.crew || []).filter((c) => c.job === "Director").map((c) => c.name);
    } else {
      directors = (data.created_by || []).map((c) => c.name);
    }

    // Similar
    const similar = (data.similar?.results || []).slice(0, 8).map((s) => ({
      tmdb_id: s.id,
      title: isMovie ? s.title : s.name,
      media_type: mediaType,
      poster_path: s.poster_path,
      vote_average: s.vote_average || 0,
      release_year: (isMovie ? s.release_date : s.first_air_date)
        ? parseInt((isMovie ? s.release_date : s.first_air_date).substring(0, 4))
        : null,
      overview: s.overview || "",
      genres: [],
      streaming_providers: [],
    }));

    // Seasons (TV only)
    let seasons = [];
    if (!isMovie && data.seasons) {
      seasons = data.seasons
        .filter((s) => s.season_number > 0)
        .map((s) => ({
          season_number: s.season_number,
          name: s.name,
          episode_count: s.episode_count,
          poster_path: s.poster_path,
          air_date: s.air_date,
        }));
    }

    const detail = {
      title: isMovie ? data.title : data.name,
      media_type: mediaType,
      overview: data.overview || "",
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      release_date: isMovie ? data.release_date : data.first_air_date,
      runtime: isMovie ? data.runtime : (data.episode_run_time?.[0] || 0),
      content_rating: contentRating,
      genres: (data.genres || []).map((g) => g.name),
      vote_average: data.vote_average || 0,
      imdb_rating: 0,
      rt_tomatometer: 0,
      rt_audience: 0,
      status: data.status || "",
      number_of_seasons: isMovie ? 0 : (data.number_of_seasons || 0),
      number_of_episodes: isMovie ? 0 : (data.number_of_episodes || 0),
      original_language: data.original_language || "",
      network: !isMovie && data.networks?.length > 0
        ? data.networks[0].name
        : (isMovie ? data.production_companies?.[0]?.name : ""),
      trailer_youtube_id: trailer?.key || null,
      cast,
      directors,
      streaming_providers: Array.from(providerNames),
      seasons,
      similar,
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: detail, timestamp: Date.now() }));
    } catch {}
    return detail;
  } catch (err) {
    console.error("Failed to fetch detail:", err);
    return null;
  }
}

// ---- Episodes ----
export async function fetchSeasonEpisodes(tmdbId, seasonNumber, title) {
  const cacheKey = `${EPISODES_CACHE_PREFIX}${tmdbId}_s${seasonNumber}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DETAIL_TTL) return data;
    }
  } catch {}

  try {
    const data = await tmdbGet(`/tv/${tmdbId}/season/${seasonNumber}`);
    const episodes = (data.episodes || []).map((e) => ({
      episode_number: e.episode_number,
      name: e.name,
      overview: e.overview || "",
      still_path: e.still_path,
      air_date: e.air_date,
      runtime: e.runtime || 0,
    }));

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: episodes, timestamp: Date.now() }));
    } catch {}
    return episodes;
  } catch (err) {
    console.error("Failed to fetch episodes:", err);
    return [];
  }
}