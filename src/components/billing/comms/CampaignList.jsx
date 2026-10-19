import React, { useState } from "react";
import { Plus, Send, Loader2, Mail, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { dispatchCampaign } from "@/lib/campaignDispatcher";

const STATUS_STYLES = {
  draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  sending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sent: "bg-lime-500/10 text-lime-400 border-lime-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  partial: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export default function CampaignList({ campaigns, templates, customers, plans, discordConfig, onNew, onChanged }) {
  const [dispatching, setDispatching] = useState(null);

  const handleDispatch = async (campaign) => {
    const template = templates.find((t) => t.id === campaign.template_id);
    if (!template) return;
    setDispatching(campaign.id);
    try {
      await dispatchCampaign(campaign, template, customers, plans, discordConfig);
      onChanged?.();
    } finally {
      setDispatching(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this campaign?")) return;
    await base44.entities.CommunicationCampaign.delete(id);
    onChanged?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Campaigns</h3>
        <Button size="sm" className="bg-lime-600 hover:bg-lime-700 text-white" onClick={onNew}>
          <Plus className="w-3.5 h-3.5" /> New Campaign
        </Button>
      </div>
      <div className="grid gap-2">
        {campaigns.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-8 text-center text-sm text-zinc-500">
            No campaigns yet — create one to broadcast emails or Discord messages
          </div>
        ) : (
          campaigns.map((c) => {
            const template = templates.find((t) => t.id === c.template_id);
            return (
              <div key={c.id} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    {c.channel === "discord" ? <MessageSquare className="w-4 h-4 text-indigo-400" /> : <Mail className="w-4 h-4 text-lime-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-zinc-100 font-medium truncate">{c.name}</p>
                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status] || STATUS_STYLES.draft}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {template?.name || "No template"} · {c.target_audience} audience
                      {c.scheduled_at && <span className="ml-2 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(c.scheduled_at).toLocaleString()}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {c.status === "sent" || c.status === "partial" ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1 text-lime-400"><CheckCircle className="w-3 h-3" /> {c.sent_count}</span>
                        {c.failed_count > 0 && <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" /> {c.failed_count}</span>}
                      </div>
                    ) : (
                      <Button size="sm" className="h-8 bg-lime-600 hover:bg-lime-700 text-white text-xs" disabled={dispatching === c.id} onClick={() => handleDispatch(c)}>
                        {dispatching === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Dispatch
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-400" onClick={() => handleDelete(c.id)}>
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}