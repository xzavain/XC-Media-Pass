import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Webhook, Search, List } from "lucide-react";
import DiscordChannelManager from "@/components/releases/admin/DiscordChannelManager";
import TmdbImporter from "@/components/releases/admin/TmdbImporter";
import ReleaseAdminList from "@/components/releases/admin/ReleaseAdminList";

export default function AdminReleases() {
  const [releases, setReleases] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [rels, chs] = await Promise.all([
      base44.entities.MediaRelease.list("-digital_vod_release_date", 200),
      base44.entities.AdminNotificationChannel.list("-created_date", 50),
    ]);
    setReleases(rels);
    setChannels(chs);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">Release Management Suite</h1>
        <p className="text-sm text-slate-500 mt-1">Configure notification channels, import TMDB titles, and manage release milestones</p>
      </div>

      <Tabs defaultValue="importer">
        <TabsList className="bg-slate-900/60 border border-slate-800">
          <TabsTrigger value="importer" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400 gap-1.5">
            <Search className="w-3.5 h-3.5" /> TMDB Importer
          </TabsTrigger>
          <TabsTrigger value="releases" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400 gap-1.5">
            <List className="w-3.5 h-3.5" /> Tracked Releases ({releases.length})
          </TabsTrigger>
          <TabsTrigger value="channels" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400 gap-1.5">
            <Webhook className="w-3.5 h-3.5" /> Discord Channels ({channels.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="importer" className="mt-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">TMDB Importer & Release Curator</h2>
            <p className="text-sm text-slate-500 mb-4">Search any movie or TV series, preview metadata, set release milestones, and publish to the customer portal.</p>
            <TmdbImporter onImported={loadAll} />
          </div>
        </TabsContent>

        <TabsContent value="releases" className="mt-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">Tracked Releases</h2>
            <p className="text-sm text-slate-500 mb-4">Edit release milestones and mark titles as imported to dispatch notifications.</p>
            <ReleaseAdminList releases={releases} channels={channels} onUpdated={loadAll} />
          </div>
        </TabsContent>

        <TabsContent value="channels" className="mt-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">Discord Webhook & Alert Channels</h2>
            <p className="text-sm text-slate-500 mb-4">Configure broadcast dispatchers for theatrical premieres, VOD drops, and server imports.</p>
            <DiscordChannelManager channels={channels} onSaved={loadAll} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}