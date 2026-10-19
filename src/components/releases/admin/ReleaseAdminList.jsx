import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Send, Pencil, Server } from "lucide-react";
import { posterUrl, daysUntil } from "@/lib/releaseApi";
import { sendDiscordWebhook } from "@/lib/watchlistSync";

export default function ReleaseAdminList({ releases, channels, onUpdated }) {
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [dispatching, setDispatching] = useState(null);

  const handleEdit = (r) => {
    setEditing(r.id);
    setEditForm({
      theatrical_release_date: r.theatrical_release_date || "",
      digital_vod_release_date: r.digital_vod_release_date || "",
      estimated_server_arrival_date: r.estimated_server_arrival_date || "",
      server_import_status: r.server_import_status || "unannounced",
      target_servers: r.target_servers || [],
    });
  };

  const handleSave = async (r) => {
    await base44.entities.MediaRelease.update(r.id, editForm);
    setEditing(null);
    onUpdated?.();
  };

  const handleMarkImported = async (r) => {
    setDispatching(r.id);
    try {
      // Update release status
      await base44.entities.MediaRelease.update(r.id, { server_import_status: "imported_live" });

      // Dispatch Discord webhooks
      const importChannels = channels.filter((c) => c.is_active && c.event_triggers?.includes("imported_to_server"));
      await Promise.all(
        importChannels.map((ch) =>
          sendDiscordWebhook(ch.webhook_url, { ...r, server_import_status: "imported_live" }, ch, "imported_to_server").catch(() => {})
        )
      );

      // Notify all users who bookmarked this title
      const watchlistItems = await base44.entities.UserWatchlist.filter({ media_release_id: r.id, notify_server_import: true });
      // Send email notifications (best-effort)
      await Promise.all(
        watchlistItems.map(async (item) => {
          try {
            const prefs = await base44.entities.NotificationPreference.filter({ user_id: item.user_id });
            if (prefs[0]?.email_enabled && prefs[0]?.user_email) {
              await base44.integrations.Core.SendEmail({
                to: prefs[0].user_email,
                subject: `Now Streaming: ${r.title}`,
                body: `<p>Great news! <strong>${r.title}</strong> is now available on your media server.</p><p>Log in to start watching.</p>`,
              });
            }
          } catch {}
        })
      );

      onUpdated?.();
    } finally { setDispatching(null); }
  };

  const toggleServer = (s) => {
    setEditForm((f) => ({
      ...f,
      target_servers: f.target_servers.includes(s) ? f.target_servers.filter((x) => x !== s) : [...f.target_servers, s],
    }));
  };

  return (
    <div className="space-y-3">
      {releases.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No releases tracked yet. Use the TMDB Importer above to add titles.</p>
      ) : (
        releases.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-3">
            <div className="flex gap-3">
              <img src={posterUrl(r.poster_path, "w185")} alt="" className="w-14 h-20 rounded object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white">{r.title}</h4>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.server_import_status === "imported_live" ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400 bg-slate-800"}`}>
                    {r.server_import_status?.replace(/_/g, " ")}
                  </span>
                  {r.digital_vod_release_date && (
                    <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                      VOD: {r.digital_vod_release_date}
                      {daysUntil(r.digital_vod_release_date) > 0 && ` (${daysUntil(r.digital_vod_release_date)}d)`}
                    </span>
                  )}
                  {r.target_servers?.map((s) => (
                    <span key={s} className="text-[10px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {r.server_import_status !== "imported_live" && (
                  <Button
                    onClick={() => handleMarkImported(r)}
                    disabled={dispatching === r.id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1"
                  >
                    {dispatching === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Mark Imported
                  </Button>
                )}
                <Button onClick={() => handleEdit(r)} variant="outline" className="border-slate-700 text-slate-300 text-xs h-7 gap-1">
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              </div>
            </div>

            {/* Inline edit form */}
            {editing === r.id && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="grid sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">Theatrical</label>
                    <Input type="date" value={editForm.theatrical_release_date} onChange={(e) => setEditForm((f) => ({ ...f, theatrical_release_date: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Digital VOD</label>
                    <Input type="date" value={editForm.digital_vod_release_date} onChange={(e) => setEditForm((f) => ({ ...f, digital_vod_release_date: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Server Arrival</label>
                    <Input type="date" value={editForm.estimated_server_arrival_date} onChange={(e) => setEditForm((f) => ({ ...f, estimated_server_arrival_date: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100 h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Target Servers</label>
                  <div className="flex gap-2">
                    {["XC-Foxtrot", "XC-Kilo", "XC-Sierra"].map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleServer(s)}
                        className={`text-xs px-2.5 py-1 rounded-lg border ${editForm.target_servers.includes(s) ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300" : "border-slate-700 text-slate-400"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleSave(r)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7">Save</Button>
                  <Button onClick={() => setEditing(null)} variant="outline" className="border-slate-700 text-slate-300 text-xs h-7">Cancel</Button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}