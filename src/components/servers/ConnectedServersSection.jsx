import React, { useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Server, Plus, Trash2, Loader2, RefreshCw, Pencil, HardDrive, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AddServerModal from "@/components/servers/AddServerModal";
import EditServerModal from "@/components/servers/EditServerModal";
import { refreshServer } from "@/lib/serverRefresh";
import { useToast } from "@/components/ui/use-toast";

const platformMeta = {
  plex: { label: "Plex", color: "#e5a00d" },
  emby: { label: "Emby", color: "#52B54B" },
  jellyfin: { label: "Jellyfin", color: "#aa5cc3" },
};

const statusMeta = {
  connected: { label: "Connected", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", Icon: CheckCircle2 },
  disconnected: { label: "Disconnected", text: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-600/20", Icon: AlertCircle },
  error: { label: "Error", text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", Icon: AlertCircle },
};

function timeAgo(iso) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ConnectedServersSection() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingIds, setRefreshingIds] = useState(new Set());
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editServer, setEditServer] = useState(null);
  const { toast } = useToast();

  const [loadError, setLoadError] = useState(null);

  const loadServers = useCallback(async () => {
    try {
      const data = await base44.entities.MediaServer.list("-last_synced");
      setServers(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message || "Could not load servers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadServers(); }, [loadServers]);

  const handleRefresh = async (server) => {
    setRefreshingIds((prev) => new Set(prev).add(server.id));
    try {
      const { status, error, libraryCount } = await refreshServer(server);
      if (status === "connected") {
        toast({ title: `${server.name} refreshed`, description: `${libraryCount} libraries found` });
      } else {
        toast({ title: `${server.name} unreachable`, description: error, variant: "destructive" });
      }
      await loadServers();
    } catch (err) {
      toast({ title: "Refresh failed", description: err.message, variant: "destructive" });
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.delete(server.id);
        return next;
      });
    }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    let ok = 0, fail = 0;
    for (const s of servers) {
      setRefreshingIds((prev) => new Set(prev).add(s.id));
      try {
        const { status } = await refreshServer(s);
        if (status === "connected") ok++; else fail++;
      } catch { fail++; }
      setRefreshingIds((prev) => { const n = new Set(prev); n.delete(s.id); return n; });
    }
    setRefreshingAll(false);
    await loadServers();
    toast({ title: "Refresh complete", description: `${ok} connected, ${fail} failed` });
  };

  const handleDelete = async (server) => {
    await base44.entities.MediaServer.delete(server.id);
    toast({ title: `${server.name} removed` });
    loadServers();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Server className="w-5 h-5 text-violet-400" /> Connected Media Servers ({servers.length})
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={refreshingAll || !servers.length} className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5">
            {refreshingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh All
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Server
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10"><div className="w-7 h-7 border-4 border-zinc-700 border-t-violet-500 rounded-full animate-spin" /></div>
      ) : loadError ? (
        <div className="border border-rose-500/30 bg-rose-500/5 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-zinc-100 font-medium">Couldn't load media servers</h3>
          <p className="text-sm text-slate-400 mt-1 mb-4">{loadError}</p>
          <Button onClick={() => { setLoading(true); loadServers(); }} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      ) : !servers.length ? (
        <div className="border border-dashed border-slate-800 rounded-xl p-10 text-center">
          <Server className="w-9 h-9 text-slate-600 mx-auto mb-3" />
          <h3 className="text-slate-300 font-medium">No media servers connected</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Add a Plex, Emby, or Jellyfin server to manage users and libraries.</p>
          <Button onClick={() => setShowAdd(true)} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" /> Add Server
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {servers.map((server) => {
            const meta = platformMeta[server.platform] || platformMeta.plex;
            const st = statusMeta[server.status] || statusMeta.disconnected;
            const StatusIcon = st.Icon;
            const isRefreshing = refreshingIds.has(server.id);
            return (
              <div key={server.id} className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}20` }}>
                    <HardDrive className="w-5 h-5" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-zinc-200 truncate">{server.name}</h3>
                      <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: meta.color }}>{meta.label}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${st.bg} ${st.border} ${st.text}`}>
                        <StatusIcon className="w-3 h-3" /> {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span className="truncate max-w-[260px]">{server.url}</span>
                      <span>· {(server.libraries || []).length} libraries</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> synced {timeAgo(server.last_synced)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleRefresh(server)} disabled={isRefreshing} className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs gap-1.5">
                      {isRefreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditServer(server)} className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-slate-700 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-950 border-slate-800">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-zinc-100">Remove {server.name}?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">This disconnects the server. Its users will remain but won't sync until re-added.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(server)} className="bg-rose-600 hover:bg-rose-700 text-white">Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddServerModal open={showAdd} onOpenChange={setShowAdd} onAdded={loadServers} />
      {editServer && <EditServerModal server={editServer} open={!!editServer} onOpenChange={(v) => !v && setEditServer(null)} onSaved={loadServers} />}
    </section>
  );
}