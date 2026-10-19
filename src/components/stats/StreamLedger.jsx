import React, { useState, useMemo } from "react";
import { Search, ArrowUpDown, Film, Tv, Music, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CodecBadge from "./CodecBadge";
import ClientBadge from "./ClientBadge";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { inferMediaType } from "@/lib/statsAggregation";
import moment from "moment";

const MEDIA_ICONS = { movie: Film, tv: Tv, music: Music };
const TOOLTIP_STYLE = { background: "#18181b", border: "1px solid #27272a", borderRadius: 8 };

function SortHeader({ label, sortKey, currentSort, currentDir, onSort }) {
  const active = currentSort === sortKey;
  return (
    <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
      <button onClick={() => onSort(sortKey)} className={`flex items-center gap-1 hover:text-zinc-200 ${active ? "text-lime-400" : ""}`}>
        {label} <ArrowUpDown className="w-3 h-3" />
      </button>
    </th>
  );
}

export default function StreamLedger({ sessions, servers, contentItems }) {
  const [search, setSearch] = useState("");
  const [serverFilter, setServerFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [sortKey, setSortKey] = useState("started_at");
  const [sortDir, setSortDir] = useState("desc");

  const thumbMap = useMemo(() => {
    const map = {};
    for (const c of contentItems) {
      if (c.thumbnail_url) map[c.title.toLowerCase()] = c.thumbnail_url;
    }
    return map;
  }, [contentItems]);

  const usernames = useMemo(() => [...new Set(sessions.map((s) => s.username).filter(Boolean))].sort(), [sessions]);

  const filtered = useMemo(() => {
    let result = sessions;
    if (serverFilter !== "all") result = result.filter((s) => s.server_id === serverFilter);
    if (userFilter !== "all") result = result.filter((s) => s.username === userFilter);
    if (statusFilter !== "all") {
      if (statusFilter === "active") result = result.filter((s) => !s.ended_at && s.started_at);
      else if (statusFilter === "playing") result = result.filter((s) => s.state === "playing");
      else if (statusFilter === "paused") result = result.filter((s) => s.state === "paused");
      else if (statusFilter === "ended") result = result.filter((s) => s.ended_at);
    }
    if (mediaFilter !== "all") result = result.filter((s) => inferMediaType(s) === mediaFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => (s.title || "").toLowerCase().includes(q) || (s.username || "").toLowerCase().includes(q));
    }
    return [...result]
      .sort((a, b) => {
        let av = a[sortKey];
        let bv = b[sortKey];
        if (sortKey === "started_at") {
          av = av ? new Date(av).getTime() : 0;
          bv = bv ? new Date(bv).getTime() : 0;
        }
        if (typeof av === "string") av = av.toLowerCase();
        if (typeof bv === "string") bv = bv.toLowerCase();
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      })
      .slice(0, 100);
  }, [sessions, serverFilter, userFilter, statusFilter, mediaFilter, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800/60 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <Radio className="w-4 h-4 text-lime-400" /> Real-Time Stream Ledger
          <span className="ml-auto text-xs text-zinc-500 normal-font font-normal">{filtered.length} of {sessions.length} streams</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input placeholder="Search title or user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 bg-zinc-950/50" />
          </div>
          <Select value={serverFilter} onValueChange={setServerFilter}>
            <SelectTrigger className="bg-zinc-950/50"><SelectValue placeholder="Server" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Servers</SelectItem>
              {servers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="bg-zinc-950/50"><SelectValue placeholder="User" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {usernames.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-zinc-950/50"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="playing">Playing</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mediaFilter} onValueChange={setMediaFilter}>
            <SelectTrigger className="bg-zinc-950/50"><SelectValue placeholder="Media Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Media</SelectItem>
              <SelectItem value="movie">Movies</SelectItem>
              <SelectItem value="tv">TV Shows</SelectItem>
              <SelectItem value="music">Music</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/40 border-b border-zinc-800/60">
            <tr>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Media</th>
              <SortHeader label="User" sortKey="username" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Client</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">IP</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Codec</th>
              <SortHeader label="Bitrate" sortKey="bitrate" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Decision</th>
              <SortHeader label="Started" sortKey="started_at" currentSort={sortKey} currentDir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-zinc-500">No streams match your filters</td></tr>
            ) : (
              filtered.map((s) => {
                const mt = inferMediaType(s);
                const MediaIcon = MEDIA_ICONS[mt];
                const thumb = thumbMap[(s.title || "").toLowerCase()];
                const isActive = !s.ended_at && s.started_at;
                return (
                  <tr key={s.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 rounded-md overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
                          {thumb ? (
                            <img src={thumb} alt={s.title} className="w-full h-full object-cover" />
                          ) : (
                            <MediaIcon className="w-5 h-5 text-zinc-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-zinc-200 truncate max-w-[200px]">{s.title || "Unknown"}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <PlatformBadge platform={s.platform} />
                            <span className="text-xs text-zinc-500 capitalize">{mt}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-200 flex-shrink-0">
                          {(s.username || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-zinc-300 truncate max-w-[120px]">{s.username || "—"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><ClientBadge clientApp={s.client_app} player={s.player} device={s.device} /></td>
                    <td className="px-3 py-2.5 text-zinc-400 font-mono text-xs">{s.ip_address || "—"}</td>
                    <td className="px-3 py-2.5"><CodecBadge codec={s.video_codec || s.source_video_codec} /></td>
                    <td className="px-3 py-2.5 text-zinc-300">{s.bitrate ? `${(s.bitrate / 1000).toFixed(1)} Mbps` : "—"}</td>
                    <td className="px-3 py-2.5">
                      {s.transcode_decision ? (
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${
                          s.transcode_decision === "direct play"
                            ? "bg-lime-500/10 text-lime-400 border-lime-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {s.transcode_decision === "direct play" ? "Direct Play" : "Transcode"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400 text-xs whitespace-nowrap">
                      {s.started_at ? (
                        <span className="flex items-center gap-1.5">
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />}
                          {moment(s.started_at).fromNow()}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}