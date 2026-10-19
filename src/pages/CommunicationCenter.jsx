import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Megaphone, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import CampaignList from "@/components/billing/comms/CampaignList";
import CampaignBuilder from "@/components/billing/comms/CampaignBuilder";

export default function CommunicationCenter() {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [discordConfig, setDiscordConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);

  const loadAll = useCallback(async () => {
    const [c, t, cust, pl, dc] = await Promise.all([
      base44.entities.CommunicationCampaign.list("-created_date", 200),
      base44.entities.EmailTemplate.list(),
      base44.entities.BillingCustomer.list("-created_date", 500),
      base44.entities.StorePlan.list(),
      base44.entities.DiscordBotConfig.list().then((r) => r[0] || null).catch(() => null),
    ]);
    setCampaigns(c);
    setTemplates(t);
    setCustomers(cust);
    setPlans(pl);
    setDiscordConfig(dc);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <Link to="/billing" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft className="w-3 h-3" /> Billing Engine
      </Link>
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-lime-400" /> Communication Center
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Batch email & Discord broadcasts — dispatch welcome emails, billing notices, and announcements on-demand or scheduled</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-lime-400" /></div>
      ) : (
        <CampaignList
          campaigns={campaigns}
          templates={templates}
          customers={customers}
          plans={plans}
          discordConfig={discordConfig}
          onNew={() => setBuilderOpen(true)}
          onChanged={loadAll}
        />
      )}

      <CampaignBuilder
        templates={templates}
        customers={customers}
        plans={plans}
        discordConfig={discordConfig}
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onDispatched={loadAll}
      />
    </div>
  );
}