import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, AlertTriangle, RefreshCw, Database, FolderSearch, HardDrive } from "lucide-react";
import { Input } from "@/components/ui/input";
import LibrarySidebar from "@/components/audit/LibrarySidebar";
import FilePathTable from "@/components/audit/FilePathTable";
import FileExplorer from "@/components/audit/FileExplorer";
import { useMediaServers, toSource } from "@/hooks/useMediaServers";
import { embyGetLibraries, embyGetItems, plexGetLibraries, plexGetItems } from "@/lib/auditApi";

const TABS = [
  { id: "explorer", label: "File Explorer", icon: HardDrive },
  { id: "audit", label: "Path Audit", icon: FolderSearch },
];

export default function AuditDashboard() {
  const { servers } = useMediaServers();
  const [activeTab, setActiveTab] = useState("explorer");

  // --- Audit tab state ---
  const [plexLibs, setPlexLibs] = useState([]);
  const [embyLibs, setEmbyLibs] = useState([]);
  const [loadingPlex, setLoadingPlex] = useState(false);
  const [loadingEmby, setLoadingEmby] = useState(false);
  const [errorPlex, setErrorPlex] = useState(null);
  const [errorEmby, setErrorEmby] = useState(null);
  const [selectedLib, setSelectedLib] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [search, setSearch] = useState("");
  const [troubleshootMode, setTroubleshootMode] = useState(false);

  // Derive connection config from the shared MediaServer list (single source
  // of truth). The first Plex and first Emby/Jellyfin server are used.
  const plexServer = servers.find((s) => s.platform === "plex");
  const embyServer = servers.find((s) => s.platform === "emby" || s.platform === "jellyfin");
  const config = {
    plexUrl: plexServer?.url || "",
    plexToken: plexServer?.api_key || "",
    embyUrl: embyServer?.url || "",
    embyToken: embyServer?.api_key || "",
  };

  useEffect(() => {
    if (config.embyUrl && config.embyToken) {
      setLoadingEmby(true);
      setErrorEmby(null);
      embyGetLibraries(config.embyUrl, config.embyToken)
        .then(setEmbyLibs)
        .catch((e) => setErrorEmby(e.message))
        .finally(() => setLoadingEmby(false));
    } else {
      setEmbyLibs([]);
    }
    if (config.plexUrl && config.plexToken) {
      setLoadingPlex(true);
      setErrorPlex(null);
      plexGetLibraries(config.plexUrl, config.plexToken)
        .then(setPlexLibs)
        .catch((e) => setErrorPlex(e.message))
        .finally(() => setLoadingPlex(false));
    } else {
      setPlexLibs([]);
    }
  }, [config.embyUrl, config.embyToken, config.plexUrl, config.plexToken]);

  const loadItems = useCallback(async (lib, searchTerm) => {
    if (!lib) return;
    setLoadingItems(true);
    setItems([]);
    try {
      let result;
      if (lib.platform === "emby") {
        result = await embyGetItems(config.embyUrl, config.embyToken, lib.id, { search: searchTerm });
      } else {
        result = await plexGetItems(config.plexUrl, config.plexToken, lib.id, { search: searchTerm });
      }
      setItems(result.items);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [config]);

  useEffect(() => {
    if (selectedLib) {
      const timeout = setTimeout(() => loadItems(selectedLib, search), search ? 400 : 0);
      return () => clearTimeout(timeout);
    }
  }, [selectedLib, search, loadItems]);

  const issueCount = items.filter(i => {
    const p = i.path || "";
    return !p || /[^\x20-\x7E]/.test(p) || /[<>:"|?*]/.test(p);
  }).length;

  const noServers = !plexServer && !embyServer;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60 bg-zinc-900/30 flex-shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-violet-400" />
            <div>
              <h1 className="text-sm font-semibold text-zinc-100">Library Audit</h1>
              <p className="text-xs text-zinc-500">Read-only server inspector</p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg p-1 ml-3">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${activeTab === tab.id
                      ? "bg-zinc-700 text-zinc-100 shadow"
                      : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "audit" && selectedLib && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search titles…"
                className="bg-zinc-800 border-zinc-700 text-zinc-200 pl-8 h-8 text-sm w-52"
              />
            </div>
          )}
          {activeTab === "audit" && (
            <>
              <button
                onClick={() => setTroubleshootMode((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all
                  ${troubleshootMode
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                  }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Troubleshoot
                {issueCount > 0 && (
                  <span className="ml-1 bg-amber-500/20 text-amber-300 text-xs px-1.5 py-0.5 rounded-full">
                    {issueCount}
                  </span>
                )}
              </button>
              {selectedLib && (
                <button
                  onClick={() => loadItems(selectedLib, search)}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
          <Link
            to="/admin/servers"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <HardDrive className="w-3.5 h-3.5" />
            Manage Servers
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === "explorer" ? (
          <FileExplorer />
        ) : noServers ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3">
            <Database className="w-10 h-10 text-zinc-700" />
            <div className="text-center">
              <p className="text-sm text-zinc-400">No media servers connected.</p>
              <p className="text-xs text-zinc-600 mt-1">Add a server on the <Link to="/admin/servers" className="text-violet-400 hover:underline">Servers</Link> page to use the Path Audit.</p>
            </div>
          </div>
        ) : (
          <>
            <LibrarySidebar
              plexLibs={plexLibs}
              embyLibs={embyLibs}
              loadingPlex={loadingPlex}
              loadingEmby={loadingEmby}
              errorPlex={errorPlex}
              errorEmby={errorEmby}
              selected={selectedLib}
              onSelect={(lib) => { setSelectedLib(lib); setSearch(""); setItems([]); }}
            />
            <div className="flex flex-col flex-1 overflow-hidden">
              {selectedLib && !loadingItems && items.length > 0 && (
                <div className="flex items-center gap-4 px-5 py-2 border-b border-zinc-800/40 bg-zinc-900/20 text-xs text-zinc-500 flex-shrink-0">
                  <span><span className="text-zinc-300 font-medium">{items.length}</span> items</span>
                  {issueCount > 0 && (
                    <span className="text-amber-400"><span className="font-medium">{issueCount}</span> with path issues</span>
                  )}
                  <span className="text-zinc-700">|</span>
                  <span className="text-zinc-600 capitalize">{selectedLib.name} · {selectedLib.platform}</span>
                </div>
              )}
              <FilePathTable
                items={items}
                loading={loadingItems}
                troubleshootMode={troubleshootMode}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}