import { Filter, X } from "lucide-react";

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
  "Drama", "Family", "Fantasy", "History", "Horror", "Music",
  "Mystery", "Romance", "Science Fiction", "Thriller", "War", "Western",
];

export default function FilterBar({ filters, onFilterChange }) {
  const { genre, minScore, year } = filters;
  const hasActive = genre || minScore > 0 || year;

  const update = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clear = () => {
    onFilterChange({ genre: "", minScore: 0, year: "" });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="w-4 h-4 text-zinc-500" />
      <select
        value={genre}
        onChange={(e) => update("genre", e.target.value)}
        className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
      >
        <option value="">All Genres</option>
        {GENRES.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>

      <select
        value={minScore}
        onChange={(e) => update("minScore", Number(e.target.value))}
        className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
      >
        <option value={0}>Any Rating</option>
        <option value={6}>6+ IMDb</option>
        <option value={7}>7+ IMDb</option>
        <option value={8}>8+ IMDb</option>
        <option value={9}>9+ IMDb</option>
      </select>

      <select
        value={year}
        onChange={(e) => update("year", e.target.value)}
        className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
      >
        <option value="">All Years</option>
        <option value="2026">2026</option>
        <option value="2025">2025</option>
        <option value="2024">2024</option>
        <option value="2023">2023</option>
        <option value="2022">2022</option>
        <option value="older">Before 2022</option>
      </select>

      {hasActive && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  );
}