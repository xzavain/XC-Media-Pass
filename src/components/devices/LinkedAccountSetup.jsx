import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Link2 } from "lucide-react";

const emptyForm = { service_type: "plex", server_id: "", server_url: "", auth_token: "", external_user_id: "", stream_limit: 2, plex_username: "", plex_email: "" };

export default function LinkedAccountSetup({ onLinked }) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.LinkedMediaAccount.create({
        ...form,
        user_id: user.id,
        last_sync_timestamp: new Date().toISOString(),
      });
      setForm(emptyForm);
      setShow(false);
      onLinked?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-md p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-lime-400" />
          <h3 className="text-sm font-semibold text-slate-200">Linked Media Accounts</h3>
        </div>
        <Button onClick={() => setShow(!show)} variant="outline" className="border-slate-700 text-slate-200 gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Link Account
        </Button>
      </div>

      {show && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Select value={form.service_type} onValueChange={(v) => setForm((f) => ({ ...f, service_type: v }))}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="plex">Plex</SelectItem><SelectItem value="emby">Emby</SelectItem><SelectItem value="jellyfin">Jellyfin</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Server ID (e.g. XC-Foxtrot)" value={form.server_id} onChange={(e) => setForm((f) => ({ ...f, server_id: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
          </div>
          <Input required placeholder="Server URL (https://...)" value={form.server_url} onChange={(e) => setForm((f) => ({ ...f, server_url: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
          <Input required placeholder="Auth Token / API Key" value={form.auth_token} onChange={(e) => setForm((f) => ({ ...f, auth_token: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="External User ID (Emby/Jellyfin)" value={form.external_user_id} onChange={(e) => setForm((f) => ({ ...f, external_user_id: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
            <Input type="number" min="1" max="10" placeholder="Stream Limit" value={form.stream_limit} onChange={(e) => setForm((f) => ({ ...f, stream_limit: Number(e.target.value) }))} className="bg-slate-800 border-slate-700 text-slate-100" />
          </div>
          {form.service_type === "plex" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Plex Username" value={form.plex_username} onChange={(e) => setForm((f) => ({ ...f, plex_username: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
              <Input placeholder="Plex Email" value={form.plex_email} onChange={(e) => setForm((f) => ({ ...f, plex_email: e.target.value }))} className="bg-slate-800 border-slate-700 text-slate-100" />
            </div>
          )}
          <Button type="submit" disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Link Account
          </Button>
        </form>
      )}
    </div>
  );
}