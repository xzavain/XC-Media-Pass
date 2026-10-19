import { posterUrl, backdropUrl } from "@/lib/mediaDiscoveryApi";
export { posterUrl, backdropUrl };

import { TMDB_API_KEY, TMDB_API_BASE } from "@/lib/tmdbConfig";

async function tmdbGet(endpoint, params = {}) {
  const url = new URL(`${TMDB_API_BASE}${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", "en-US");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

// Search both movies and TV shows
export async function searchTmdbAll(query) {
  if (!query || query.length < 2) return [];
  try {
    const [movies, tv] = await Promise.all([
      tmdbGet("/search/movie", { query, include_adult: false }),
      tmdbGet("/search/tv", { query, include_adult: false }),
    ]);
    const movieResults = (movies.results || []).slice(0, 4).map((r) => ({
      ...r, media_type: "movie", title: r.title, release_date: r.release_date, poster_path: r.poster_path,
    }));
    const tvResults = (tv.results || []).slice(0, 4).map((r) => ({
      ...r, media_type: "tv_show", title: r.name, release_date: r.first_air_date, poster_path: r.poster_path,
    }));
    return [...movieResults, ...tvResults];
  } catch { return []; }
}

// Fetch full TMDB details for a movie or TV show
export async function fetchTmdbDetails(tmdbId, mediaType = "movie") {
  const isMovie = mediaType === "movie";
  const endpoint = isMovie
    ? `/movie/${tmdbId}?append_to_response=release_dates,videos,credits`
    : `/tv/${tmdbId}?append_to_response=content_ratings,videos,credits`;
  const data = await tmdbGet(endpoint);

  let certification = null;
  if (isMovie) {
    const us = data.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
    certification = us?.release_dates?.[0]?.certification || null;
  } else {
    const us = data.content_ratings?.results?.find((r) => r.iso_3166_1 === "US");
    certification = us?.rating || null;
  }

  const trailer = data.videos?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube" && v.official)
    || data.videos?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube");

  const cast = (data.credits?.cast || []).slice(0, 12).map((c) => ({ id: c.id, name: c.name, character: c.character, profile_path: c.profile_path, known_for_department: c.known_for_department }));
  const crew = (data.credits?.crew || []).filter((c) => c.job === "Director" || c.job === "Producer" || c.job === "Writer").slice(0, 4).map((c) => ({ id: c.id, name: c.name, job: c.job, department: c.department, profile_path: c.profile_path }));
  const director = isMovie
    ? (data.credits?.crew || []).find((c) => c.job === "Director")?.name || null
    : (data.created_by || []).map((c) => c.name).join(", ") || null;

  return {
    tmdb_id: data.id,
    media_type: isMovie ? "movie" : "tv_show",
    title: isMovie ? data.title : data.name,
    tagline: data.tagline || "",
    overview: data.overview || "",
    poster_path: data.poster_path,
    backdrop_path: data.backdrop_path,
    genres: (data.genres || []).map((g) => g.name),
    runtime_minutes: isMovie ? data.runtime : (data.episode_run_time?.[0] || 0),
    certification,
    theatrical_release_date: isMovie ? data.release_date : data.first_air_date,
    trailer_youtube_key: trailer?.key || null,
    cast,
    crew,
    director,
    studio: isMovie ? data.production_companies?.[0]?.name : data.networks?.[0]?.name || "",
  };
}

// Days remaining until a date string (null = no date, negative = past)
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// Group releases into time buckets
export function groupReleasesByTime(releases) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  const endOfNextWeek = new Date(startOfWeek);
  endOfNextWeek.setDate(startOfWeek.getDate() + 14);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const groups = { thisWeek: [], nextWeek: [], thisMonth: [], nextMonth: [], future: [] };
  releases.forEach((r) => {
    const dateStr = r.digital_vod_release_date || r.theatrical_release_date || r.estimated_server_arrival_date;
    if (!dateStr) { groups.future.push(r); return; }
    const date = new Date(dateStr + "T00:00:00");
    if (date < now) return;
    if (date < endOfWeek) groups.thisWeek.push(r);
    else if (date < endOfNextWeek) groups.nextWeek.push(r);
    else if (date <= endOfMonth) groups.thisMonth.push(r);
    else if (date <= endOfNextMonth) groups.nextMonth.push(r);
    else groups.future.push(r);
  });
  return groups;
}

export const GROUP_LABELS = {
  thisWeek: "This Week",
  nextWeek: "Next Week",
  thisMonth: "This Month",
  nextMonth: "Next Month",
  future: "Future Anticipated",
};

// Build a 42-day calendar grid for a given month
export function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const days = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  while (days.length < 42) {
    const last = days[days.length - 1].date;
    days.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), isCurrentMonth: false });
  }
  return days;
}

export function formatDateKey(date) {
  return date.toISOString().split("T")[0];
}

// ─── TMDB Ingestion Pipeline (4-Month Rolling Sync) ───

export async function ingestUpcomingReleases() {
  const now = new Date();
  const fourMonthsLater = new Date(now);
  fourMonthsLater.setMonth(fourMonthsLater.getMonth() + 4);
  const startDate = now.toISOString().split("T")[0];
  const endDate = fourMonthsLater.toISOString().split("T")[0];

  const [discoverMovies, upcomingMovies, discoverTv] = await Promise.all([
    tmdbGet("/discover/movie", { "primary_release_date.gte": startDate, "primary_release_date.lte": endDate, "sort_by": "popularity.desc", page: 1 }),
    tmdbGet("/movie/upcoming", { page: 1 }),
    tmdbGet("/discover/tv", { "first_air_date.gte": startDate, "first_air_date.lte": endDate, "sort_by": "popularity.desc", page: 1 }),
  ]);

  // Normalize + dedupe movies
  const movieMap = new Map();
  [...(discoverMovies.results || []), ...(upcomingMovies.results || [])].forEach((m) => {
    movieMap.set(m.id, {
      id: `tmdb-${m.id}`,
      tmdb_id: m.id,
      title: m.title,
      overview: m.overview,
      media_type: "movie",
      theatrical_release_date: m.release_date,
      digital_vod_release_date: null,
      poster_path: m.poster_path,
      backdrop_path: m.backdrop_path,
      vote_average: m.vote_average,
      genres: [],
      popularity: m.popularity,
      trailer_youtube_key: null,
    });
  });
  const movies = Array.from(movieMap.values()).sort((a, b) => b.popularity - a.popularity).slice(0, 40);

  // Normalize TV
  const tvShows = (discoverTv.results || []).slice(0, 20).map((t) => ({
    id: `tmdb-${t.id}`,
    tmdb_id: t.id,
    title: t.name,
    overview: t.overview,
    media_type: "tv_show",
    theatrical_release_date: t.first_air_date,
    digital_vod_release_date: null,
    poster_path: t.poster_path,
    backdrop_path: t.backdrop_path,
    vote_average: t.vote_average,
    genres: [],
    popularity: t.popularity,
    trailer_youtube_key: null,
  }));

  // Fetch digital release dates for top 20 movies (type 4 = Digital, type 5 = Physical)
  const topMovies = movies.slice(0, 20);
  const rdResults = await Promise.allSettled(topMovies.map((m) => tmdbGet(`/movie/${m.tmdb_id}/release_dates`)));
  rdResults.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    const us = result.value?.results?.find((r) => r.iso_3166_1 === "US");
    if (!us) return;
    const digital = us.release_dates?.find((rd) => rd.type === 4);
    if (digital?.release_date) topMovies[i].digital_vod_release_date = digital.release_date.split("T")[0];
  });

  // Fetch trailer keys for top 20 releases
  const topForTrailers = [...topMovies.slice(0, 15), ...tvShows.slice(0, 5)];
  const trailerResults = await Promise.allSettled(
    topForTrailers.map((r) => tmdbGet(`/${r.media_type === "movie" ? "movie" : "tv"}/${r.tmdb_id}/videos`))
  );
  trailerResults.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    const trailer = result.value?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube" && v.official)
      || result.value?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube");
    if (trailer) topForTrailers[i].trailer_youtube_key = trailer.key;
  });

  return [...movies, ...tvShows];
}

// ─── Person Profile (Actor & Crew Explorer) ───

export async function fetchPersonDetails(personId) {
  return tmdbGet(`/person/${personId}`);
}

export async function fetchPersonImages(personId) {
  return tmdbGet(`/person/${personId}/images`);
}

export async function fetchPersonCredits(personId) {
  return tmdbGet(`/person/${personId}/combined_credits`);
}

export function profileUrl(profilePath, size = "w185") {
  if (!profilePath) return null;
  return `https://image.tmdb.org/t/p/${size}${profilePath}`;
}