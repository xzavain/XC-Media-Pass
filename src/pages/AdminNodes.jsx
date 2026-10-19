import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import AlertManager from "@/components/diagnostics/admin/AlertManager";
import FleetHealthControls from "@/components/diagnostics/admin/FleetHealthControls";
import GlobalTelemetryOverview from "@/components/diagnostics/admin/GlobalTelemetryOverview";
import { Megaphone, ServerCog, BarChart3 } from "lucide-react";

export default function AdminNodes() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "staff";
  const [servers, setServers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [serverList, alertList, sessionList] = await Promise.all([
      base44.entities.Server.list("-created_date", 100),
      base44.entities.ServerAlert.list("-created_date", 50),
      base44.entities.ActiveSession.list("-created_date", 200),
    ]);
    setServers(serverList);
    setAlerts(alertList);
    setSessions(sessionList);
    setLoading(false);
  }, []);

  useEffect(() => { if (isStaff) loadAll(); }, [isStaff, loadAll]);

  if (!isStaff) {
    return <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Only staff and admins can access the node diagnostics dashboard.</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">Live Node Health, Latency & Transcode Diagnostic Hub</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage fleet health, broadcast alerts, and monitor global telemetry</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-lime-400" /> Global Telemetry Overview</h2>
        <GlobalTelemetryOverview sessions={sessions} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2"><Megaphone className="w-5 h-5 text-lime-400" /> Status Alert Manager</h2>
        <AlertManager servers={servers} alerts={alerts} onAlertsChanged={loadAll} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2"><ServerCog className="w-5 h-5 text-lime-400" /> Server Fleet Health Controls</h2>
        <FleetHealthControls servers={servers} onServersChanged={loadAll} />
      </section>
    </div>
  );
}