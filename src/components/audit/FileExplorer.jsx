import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { HardDrive, ArrowLeft, ArrowUp, RefreshCw, Home, ChevronRight, AlertCircle, Loader2, Search } from "lucide-react";
import {
  embyBrowseDirectory, embyGetDrives, embyGetLibraryPaths,
  plexBrowseDirectory, plexGetLibraryPaths,
} from "@/lib/auditApi";
import { useMediaServers, toSource } from "@/hooks/useMediaServers";
import { getQuickAccess, togglePin as togglePinStorage, getViewMode, saveViewMode } from "@/lib/fileManagerStorage";
import DirectoryTree from "@/components/audit/DirectoryTree";
import PlatformLogo from "@/components/shared/PlatformLogo";
import QuickAccessPanel from "@/components/audit/QuickAccessPanel";
import FileView from "@/components/audit/FileView";
import ViewModeSelector from "@/components/audit/ViewModeSelector";
import ImageLightbox from "@/components/audit/ImageLightbox";
import SearchResultsDropdown from "@/components/audit/SearchResultsDropdown";
import FilePropertiesPanel from "@/components/audit/FilePropertiesPanel";
import { buildFolderInfoMap } from "@/lib/folderInfoMap";

function Breadcrumb({ pathStack, onNavigate }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [pathStack]);
  return (
    <div ref={scrollRef} className="flex items-center gap-1 text-xs text-zinc-400 min-w-0 overflow-x-auto py-1">
      <button onClick={() => onNavigate(-1)} className="flex items-center gap-1 hover:text-zinc-200 flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-zinc-800">
        <Home className="w-3 h-3" />
      </button>
      {pathStack.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="w-3 h-3 text-zinc-700 flex-shrink-0" />
          <button onClick={() => onNavigate(i)} className={`px-1.5 py-0.5 rounded hover:bg-zinc-800 whitespace-nowrap truncate max-w-[160px] ${i === pathStack.length - 1 ? "text-zinc-200 font-medium" : "hover:text-zinc-200"}`}>
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function FileExplorer() {
  const { servers, isLoading: serversLoading } = useMediaServers();
  const serverSources = servers.map(toSource);

  const [activeSource, setActiveSource] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pathStack, setPathStack] = useState([]);
  const [roots, setRoots] = useState([]);
  const [pins, setPins] = useState(getQuickAccess);
  const [lightboxFile, setLightboxFile] = useState(null);
  const [propertiesFile, setPropertiesFile] = useState(null);
  const [viewMode, setViewMode] = useState(getViewMode);
  const [infoMap, setInfoMap] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchToken = useRef(0);

  // Auto-select the first server once the shared list loads.
  useEffect(() => {
    if (serverSources.length && !activeSource) setActiveSource(serverSources[0]);
  }, [serverSources, activeSource]);

  const fetchDir = useCallback(async (path) => {
    if (!activeSource) throw new Error("No server selected");
    return activeSource.platform === "plex"
      ? plexBrowseDirectory(activeSource.url, activeSource.token, path)
      : embyBrowseDirectory(activeSource.url, activeSource.token, path);
  }, [activeSource]);

  // Load drives + library roots when the active server changes.
  useEffect(() => {
    if (!activeSource) return;
    setPathStack([]);
    setEntries([]);
    setError(null);
    setRoots([]);
    if (window.location.protocol === "https:" && activeSource.url.startsWith("http://")) {
      setError("This app runs on HTTPS, so your browser blocks requests to an HTTP server address. Use an HTTPS URL for this server (e.g. a plex.direct address or a reverse proxy).");
      return;
    }
    const isPlex = activeSource.platform === "plex";
    Promise.allSettled([
      isPlex ? plexBrowseDirectory(activeSource.url, activeSource.token, "") : embyGetDrives(activeSource.url, activeSource.token),
      isPlex ? plexGetLibraryPaths(activeSource.url, activeSource.token) : embyGetLibraryPaths(activeSource.url, activeSource.token),
    ]).then(([drivesRes, libRes]) => {
      const drives = drivesRes.status === "fulfilled" ? drivesRes.value : [];
      const libs = libRes.status === "fulfilled" ? libRes.value : [];
      const seen = new Set();
      const merged = [];
      for (const item of [...drives, ...libs]) {
        if (item.path && !seen.has(item.path)) { seen.add(item.path); merged.push(item); }
      }
      setRoots(merged);
      setEntries(merged);
      if (merged.length === 0) {
        const reason = drivesRes.status === "rejected" ? drivesRes.reason?.message : libRes.reason?.message;
        setError(reason || "Couldn't load any folders from this server. Check the URL and token are correct and the server is reachable from the internet.");
      }
    });
  }, [activeSource]);

  // Build the recursive folder size/date/artwork map from the library index.
  useEffect(() => {
    if (!activeSource) { setInfoMap(null); setMetaLoading(false); return; }
    let cancelled = false;
    setInfoMap(null);
    setMetaLoading(true);
    buildFolderInfoMap({ url: activeSource.url, api_key: activeSource.token, platform: activeSource.platform })
      .then((map) => { if (!cancelled) { setInfoMap(map); setMetaLoading(false); } })
      .catch(() => { if (!cancelled) { setInfoMap(null); setMetaLoading(false); } });
    return () => { cancelled = true; };
  }, [activeSource]);

  const navigateTo = useCallback(async (path, name) => {
    setLoading(true);
    setError(null);
    setShowResults(false);
    setPathStack((prev) => {
      const existing = prev.findIndex((p) => p.path === path);
      if (existing >= 0) return prev.slice(0, existing + 1);
      return [...prev, { name, path }];
    });
    try {
      const items = await fetchDir(path);
      setEntries(items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchDir]);

  const navigateBreadcrumb = (index) => {
    if (index === -1) {
      setPathStack([]);
      setEntries(roots);
      setError(null);
    } else {
      const target = pathStack[index];
      setPathStack((prev) => prev.slice(0, index + 1));
      navigateTo(target.path, target.name);
    }
  };

  const goBack = () => (pathStack.length <= 1 ? navigateBreadcrumb(-1) : navigateBreadcrumb(pathStack.length - 2));
  const goUp = () => (pathStack.length <= 1 ? navigateBreadcrumb(-1) : navigateBreadcrumb(pathStack.length - 2));
  const refresh = () => {
    if (pathStack.length === 0) setEntries(roots);
    else { const cur = pathStack[pathStack.length - 1]; navigateTo(cur.path, cur.name); }
  };

  const handleTogglePin = (entry) => {
    const updated = togglePinStorage({ label: entry.name, path: entry.path, serverUrl: activeSource.url });
    setPins(updated);
  };

  const handlePinNavigate = (pin) => {
    const src = serverSources.find((s) => s.url === pin.serverUrl) || activeSource;
    if (src && src.url !== activeSource?.url) setActiveSource(src);
    setTimeout(() => navigateTo(pin.path, pin.label), src.url !== activeSource?.url ? 400 : 0);
  };

  // Global recursive search across the whole drive (bounded traversal)
  const runSearch = async (term) => {
    const myToken = ++searchToken.current;
    setSearching(true);
    setSearchResults([]);
    const results = [];
    const visited = new Set();
    const queue = roots.map((r) => ({ path: r.path, breadcrumb: [{ name: r.name, path: r.path }] }));
    const MAX_VISITS = 150;
    const MAX_RESULTS = 80;
    const MAX_DEPTH = 6;
    let visits = 0;

    while (queue.length > 0 && visits < MAX_VISITS && results.length < MAX_RESULTS) {
      if (searchToken.current !== myToken) return;
      const { path, breadcrumb } = queue.shift();
      if (visited.has(path) || breadcrumb.length > MAX_DEPTH) continue;
      visited.add(path);
      visits++;
      try {
        const items = await fetchDir(path);
        for (const item of items) {
          if (item.name.toLowerCase().includes(term.toLowerCase())) {
            results.push({ ...item, breadcrumb });
            if (results.length >= MAX_RESULTS) break;
          }
          if (item.isDirectory) {
            queue.push({ path: item.path, breadcrumb: [...breadcrumb, { name: item.name, path: item.path }] });
          }
        }
      } catch { /* skip inaccessible folders */ }
    }
    if (searchToken.current === myToken) {
      setSearchResults(results);
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || !activeSource) return;
    setShowResults(true);
    runSearch(query.trim());
  };

  const handleJumpToResult = (result) => {
    setShowResults(false);
    setQuery("");
    const parent = result.breadcrumb[result.breadcrumb.length - 1];
    setPathStack(result.breadcrumb);
    navigateTo(parent.path, parent.name).then(() => {
      setPathStack(result.breadcrumb);
    });
  };

  if (serversLoading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 text-zinc-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" /> Loading servers…
      </div>
    );
  }

  if (serverSources.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3">
        <HardDrive className="w-10 h-10 text-zinc-700" />
        <div className="text-center">
          <p className="text-sm text-zinc-400">No Plex, Emby, or Jellyfin servers connected.</p>
          <p className="text-xs text-zinc-600 mt-1">Add a server on the <Link to="/admin/servers" className="text-violet-400 hover:underline">Servers</Link> page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-zinc-800/60 bg-zinc-900/20 overflow-y-auto flex flex-col">
        {serverSources.length > 1 && (
          <div className="px-2 pt-2 pb-1 border-b border-zinc-800/40">
            <p className="text-xs text-zinc-600 uppercase tracking-wider px-1 mb-1.5 font-semibold">Server</p>
            {serverSources.map((src, i) => (
              <button key={i} onClick={() => setActiveSource(src)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors mb-0.5 ${activeSource?.url === src.url ? "bg-violet-500/10 text-violet-300 border border-violet-500/20" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent"}`}>
                <PlatformLogo platform={src.platform} className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{src.label}</span>
              </button>
            ))}
          </div>
        )}
        <QuickAccessPanel pins={pins} activePath={pathStack[pathStack.length - 1]?.path} onNavigate={handlePinNavigate} onUnpin={handleTogglePin} />
        <DirectoryTree roots={roots} fetchDir={fetchDir} activePath={pathStack[pathStack.length - 1]?.path} onNavigate={navigateTo} onHome={() => navigateBreadcrumb(-1)} homeLabel={activeSource?.label} />
      </div>

      {/* Main panel */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/40 bg-zinc-900/20 flex-shrink-0">
          <button onClick={goBack} disabled={pathStack.length === 0} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
          <button onClick={goUp} disabled={pathStack.length === 0} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"><ArrowUp className="w-4 h-4" /></button>
          <button onClick={refresh} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <div className="flex-1 bg-zinc-800/60 border border-zinc-700/60 rounded-md px-3 py-1 min-w-0">
            <Breadcrumb pathStack={pathStack} onNavigate={navigateBreadcrumb} />
          </div>
          <form onSubmit={handleSearchSubmit} className="relative w-56 flex-shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query && setShowResults(true)}
              placeholder="Search entire drive…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md pl-8 pr-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            {showResults && (
              <SearchResultsDropdown results={searchResults} searching={searching} onJump={handleJumpToResult} />
            )}
          </form>
          {metaLoading && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 flex-shrink-0">
              <Loader2 className="w-3 h-3 animate-spin" />
              Calculating sizes…
            </div>
          )}
          <ViewModeSelector value={viewMode} onChange={(m) => { setViewMode(m); saveViewMode(m); }} />
        </div>

        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-zinc-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" /> Loading…
          </div>
        ) : (
          <FileView
            viewMode={viewMode}
            entries={entries}
            infoMap={infoMap}
            metaLoading={metaLoading}
            serverUrl={activeSource?.url}
            onNavigate={navigateTo}
            onImageClick={setLightboxFile}
            onTogglePin={handleTogglePin}
            onShowProperties={setPropertiesFile}
          />
        )}
      </div>

      <ImageLightbox file={lightboxFile} onClose={() => setLightboxFile(null)} />
      <FilePropertiesPanel
        file={propertiesFile}
        source={activeSource}
        libraryRoots={roots}
        onClose={() => setPropertiesFile(null)}
      />
    </div>
  );
}