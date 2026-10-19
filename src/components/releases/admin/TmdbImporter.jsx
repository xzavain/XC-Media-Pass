import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Plus, Film, Tv } from "lucide-react";
import { searchTmdbAll, fetchTmdbDetails, posterUrl } from "@/lib/releaseApi";

const emptyForm = {
  theatrical_release_date: "",
  digital_vod_release_date: "",
  physical_disc_release_date: "",
  estimated_server_arrival_date: "",
  target_servers: ["XC-Foxtrot", "XC-Kilo", "XC-Sierra"],
  server_import_status: "monitored",
};

export default function TmdbImporter({ onImported }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setResults(await searchTmdbAll(query));
    }, 350);
  }, [query]);

  const handleSelect = async (r) => {
    setSelected(r);
    setResults([]);
    setQuery("");
    setLoadingDetails(true);
    try {
      const d = await fetchTmdbDetails(r.id, r.media_type === "tv_show" ? "tv" : "movie");
      setDetails(d);
      setForm((f) => ({
        ...f,
        theatrical_release_date: d.theatrical_release_date || "",
      }));
    } finally { setLoadingDetails(false); }
  };

  const handlePublish = async () => {
    if (!details) return;
    setSaving(true);
    try {
      await base44.entities.MediaRelease.create({
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
        studio: details.studio,
        ...form,
        target_servers: form.target_servers,
      });
      setSelected(null);
      setDetails(null);
      setForm(emptyForm);
      onImported?.();
    } finally { setSaving(false); }
  };

  const toggleServer = (s) => {
    setForm((f) => ({
      ...f,
      target_servers: f.target_servers.includes(s) ? f.target_servers.filter((x) => x !== s) : [...f.target_servers, s],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search TMDB to import a movie or TV show..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-slate-800 border-slate-700 text-slate-100"
        />
        {results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
            {results.map((r) => (
              <button
                key={`${r.media_type}-${r.id}`}
                onClick={() => handleSelect(r)}
                className="flex items-center gap-3 w-full p-2.5 hover:bg-slate-800 text-left border-b border-slate-800/50 last:border-0"
              >
                {r.poster_path ? <img src={posterUrl(r.poster_path, "w92")} alt="" className="w-8 h-12 rounded" /> : <div className="w-8 h-12 rounded bg-slate-800" />}
                <div>
                  <p className="text-sm text-white">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.release_date?.substring(0, 4) || "TBD"} · {r.media_type === "movie" ? "Movie" : "TV"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview & milestone form */}
      {selected && (
        <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/40 space-y-4">
          {loadingDetails ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : details ? (
            <>
              <div className="flex gap-4">
                <img src={posterUrl(details.poster_path)} alt="" className="w-24 h-36 rounded-lg shadow-lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {details.media_type === "movie" ? <Film className="w-4 h-4 text-indigo-400" /> : <Tv className="w-4 h-4 text-purple-400" />}
                    <h4 className="text-lg font-bold text-white">{details.title}</h4>
                  </div>
                  {details.tagline && <p className="text-sm text-slate-400 italic">{details.tagline}</p>}
                  <p className="text-xs text-slate-400 mt-1 line-clamp-3">{details.overview}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {details.genres?.map((g) => <span key={g} className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">{g}</span>)}
                    {details.certification && <span className="text-xs border border-slate-600 px-1.5 rounded text-slate-300">{details.certification}</span>}
                  </div>
                </div>
              </div>

              {/* Milestone date inputs */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Theatrical Release Date</label>
                  <Input type="date" value={form.theatrical_release_date} onChange={(e) => setForm((f) => ({ ...f, theatrical_release_date: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Digital VOD Release Date</label>
                  <Input type="date" value={form.digital_vod_release_date} onChange={(e) => setForm((f) => ({ ...f, digital_vod_release_date: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Physical Disc Date</label>
                  <Input type="date" value={form.physical_disc_release_date} onChange={(e) => setForm((f) => ({ ...f, physical_disc_release_date: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Estimated Server Arrival</label>
                  <Input type="date" value={form.estimated_server_arrival_date} onChange={(e) => setForm((f) => ({ ...f, estimated_server_arrival_date: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
                </div>
              </div>

              {/* Target servers */}
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Target Servers</label>
                <div className="flex flex-wrap gap-2">
                  {["XC-Foxtrot", "XC-Kilo", "XC-Sierra"].map((s) => (
                    <label key={s} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg cursor-pointer border ${form.target_servers.includes(s) ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300" : "border-slate-700 text-slate-400"}`}>
                      <input type="checkbox" checked={form.target_servers.includes(s)} onChange={() => toggleServer(s)} className="sr-only" />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={handlePublish} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Publish to Customer Portal
              </Button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}