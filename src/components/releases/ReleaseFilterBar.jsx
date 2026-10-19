import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, List } from "lucide-react";
import { searchTmdbAll, posterUrl } from "@/lib/releaseApi";

export default function ReleaseFilterBar({ view, onViewChange, stage, onStageChange, server, onServerChange, onTmdbSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const data = await searchTmdbAll(query);
      setResults(data);
      setShowDropdown(true);
    }, 350);
  }, [query]);

  const views = [
    { key: "calendar", label: "Calendar", icon: Calendar },
    { key: "timeline", label: "Timeline", icon: List },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* View toggle */}
      <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1 border border-slate-800">
        {views.map((v) => {
          const Icon = v.icon;
          return (
            <button
              key={v.key}
              onClick={() => onViewChange(v.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${view === v.key ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              <Icon className="w-3.5 h-3.5" /> {v.label}
            </button>
          );
        })}
      </div>

      {/* Stage filter */}
      <Select value={stage} onValueChange={onStageChange}>
        <SelectTrigger className="w-44 bg-slate-900/60 border-slate-800 text-slate-200"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          <SelectItem value="all">All Releases</SelectItem>
          <SelectItem value="vod">Digital VOD Drops</SelectItem>
          <SelectItem value="theatrical">Theatrical Debuts</SelectItem>
          <SelectItem value="imported">Recently Imported</SelectItem>
        </SelectContent>
      </Select>

      {/* Server filter */}
      <Select value={server} onValueChange={onServerChange}>
        <SelectTrigger className="w-44 bg-slate-900/60 border-slate-800 text-slate-200"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          <SelectItem value="all">All Servers</SelectItem>
          <SelectItem value="XC-Foxtrot">XC-Foxtrot (Plex)</SelectItem>
          <SelectItem value="XC-Kilo">XC-Kilo (Emby)</SelectItem>
          <SelectItem value="XC-Sierra">XC-Sierra (Jellyfin)</SelectItem>
        </SelectContent>
      </Select>

      {/* TMDB search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search TMDB for any movie or show..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          className="pl-9 bg-slate-900/60 border-slate-800 text-slate-200"
        />
        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
            {results.map((r) => (
              <button
                key={`${r.media_type}-${r.id}`}
                onClick={() => { onTmdbSelect(r); setShowDropdown(false); setQuery(""); setResults([]); }}
                className="flex items-center gap-3 w-full p-2.5 hover:bg-slate-800 text-left border-b border-slate-800/50 last:border-0"
              >
                {r.poster_path ? (
                  <img src={posterUrl(r.poster_path, "w92")} alt="" className="w-8 h-12 rounded object-cover" />
                ) : (
                  <div className="w-8 h-12 rounded bg-slate-800" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.release_date?.substring(0, 4) || "TBD"} · {r.media_type === "movie" ? "Movie" : "TV"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}