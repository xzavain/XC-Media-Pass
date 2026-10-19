// Centralized TMDB configuration.
// The API key is read from the Vite environment (VITE_TMDB_API_KEY, defined in
// the gitignored .env file) so it is never hardcoded as a literal in source.
export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || "";
export const TMDB_API_BASE = "https://api.themoviedb.org/3";