import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useMediaAuth } from "@/lib/MediaAuthContext";
import ConcurrencyMeter from "@/components/devices/ConcurrencyMeter";
import DeviceSessionCard from "@/components/devices/DeviceSessionCard";
import KillStreamModal from "@/components/devices/KillStreamModal";
import IdleDevicesTable from "@/components/devices/IdleDevicesTable";
import SecurityPanel from "@/components/devices/SecurityPanel";
import AuditLogDrawer from "@/components/devices/AuditLogDrawer";
import { fetchAccountSessions, enrichWithGeo, killDeviceSession } from "@/lib/deviceSessionApi";
import { Link } from "react-router-dom";
import { Loader2, Smartphone, Shield, Link2 } from "lucide-react";

export default function CustomerDevices() {
  const { user } = useAuth();
  const { accounts, isAnyConnected, isLoading: authLoading } = useMediaAuth();
  const [sessions, setSessions] = useState([]);
  const [killLogs, setKillLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [killTarget, setKillTarget] = useState(null);
  const accountsRef = useRef([]);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  const loadSessions = useCallback(async (accountList) => {
    const results = await Promise.allSettled(accountList.map((acc) => fetchAccountSessions(acc)));
    const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const enriched = await enrichWithGeo(all);
    setSessions(enriched);
  }, []);

  const loadKillLogs = useCallback(async () => {
    if (!user) return;
    const list = await base44.entities.SessionKillLog.filter({ user_id: user.id }, "-terminated_at", 10);
    setKillLogs(list);
  }, [user]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      if (accountsRef.current.length > 0) await loadSessions(accountsRef.current);
      await loadKillLogs();
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [loadSessions, loadKillLogs]);

  useEffect(() => {
    if (!authLoading) refreshAll();
  }, [authLoading, refreshAll]);

  // Auto-refresh polling — uses globally propagated credentials, zero prompts
  useEffect(() => {
    if (!autoRefresh || accounts.length === 0) return;
    const interval = setInterval(() => { loadSessions(accountsRef.current); }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadSessions, accounts]);

  const handleKill = async (reason, sendToast) => {
    if (!killTarget) return;
    const account = accounts.find((a) => a.server_id === killTarget.server_id);
    setSessions((prev) => prev.filter((s) => s.session_key !== killTarget.session_key));
    try {
      const msg = sendToast ? "Session stopped via Customer Portal." : reason;
      await killDeviceSession(account, killTarget.session_key, msg);
      await base44.entities.SessionKillLog.create({
        user_id: user.id,
        device_name: killTarget.device_name,
        service_type: killTarget.service_type,
        triggered_by: "Customer Self-Service",
        terminated_at: new Date().toISOString(),
        reason,
      });
      loadKillLogs();
    } catch {
      setSessions((prev) => [...prev, killTarget]);
    }
  };

  const handleRevokeIdle = async (session) => {
    const account = accounts.find((a) => a.server_id === session.server_id);
    setSessions((prev) => prev.filter((s) => s.session_key !== session.session_key));
    try {
      await killDeviceSession(account, session.session_key, "Device access revoked via Customer Portal");
      await base44.entities.SessionKillLog.create({
        user_id: user.id, device_name: session.device_name, service_type: session.service_type,
        triggered_by: "Customer Self-Service", terminated_at: new Date().toISOString(),
        reason: "Device access revoked",
      });
      loadKillLogs();
    } catch {
      setSessions((prev) => [...prev, session]);
    }
  };

  const activeSessions = sessions.filter((s) => s.playback_state !== "idle");
  const totalStreamLimit = accounts.reduce((sum, a) => sum + (a.stream_limit || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-100 flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-lime-400" /> Stream Manager
        </h1>
        <p className="text-sm text-slate-500 mt-1">Monitor active devices, kill streams, and manage your account security</p>
      </div>

      {/* Linked account setup */}
      {!isAnyConnected && accounts.length === 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
          <p className="text-sm text-amber-300 mb-3">No media accounts linked yet. Connect your Plex, Emby, or Jellyfin account to manage streams.</p>
          <Link to="/customer/connect-servers" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
            <Link2 className="w-4 h-4" /> Connect Your Media Accounts
          </Link>
        </div>
      )}

      {/* Linked but no streaming nodes configured yet */}
      {isAnyConnected && accounts.length === 0 && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-6 text-center">
          <p className="text-sm text-sky-300 mb-1">Your media account is linked, but no streaming nodes are assigned to your account yet.</p>
          <p className="text-xs text-slate-400">Live sessions and device controls will appear here once staff assigns you to a streaming node. If this persists, please open a support ticket.</p>
        </div>
      )}

      {/* Concurrency meter */}
      {accounts.length > 0 && (
        <ConcurrencyMeter
          activeCount={activeSessions.length}
          streamLimit={totalStreamLimit}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
          onForceRefresh={refreshAll}
          refreshing={refreshing}
        />
      )}

      {/* Active device sessions */}
      {accounts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-100">Active Device Sessions</h2>
          {activeSessions.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500 rounded-xl border border-slate-800 bg-slate-950/40">
              No active playback sessions detected.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeSessions.map((s) => (
                <DeviceSessionCard key={`${s.service_type}-${s.session_key}`} session={s} onKill={setKillTarget} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Idle devices table */}
      {accounts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-lime-400" /> Idle Registered Devices
          </h2>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <IdleDevicesTable sessions={sessions} onRevoke={handleRevokeIdle} />
          </div>
        </section>
      )}

      {/* Security panel */}
      {accounts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-lime-400" /> Security & Token Management
          </h2>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <SecurityPanel accounts={accounts} onAccountChanged={refreshAll} />
          </div>
        </section>
      )}

      {/* Audit log */}
      <AuditLogDrawer logs={killLogs} />

      {/* Kill stream modal */}
      <KillStreamModal session={killTarget} open={!!killTarget} onOpenChange={(v) => !v && setKillTarget(null)} onConfirm={handleKill} />
    </div>
  );
}