import React, { useState } from "react";
import { Shield, Pencil, Check, X, Mail, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

// User Information & Database Overrides — admins can override the stored
// display name (friendly_name) and notes directly in the local database.
export default function UserInfoSection({ serverUser, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(serverUser.friendly_name || serverUser.username);
  const [notes, setNotes] = useState(serverUser.notes || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.ServerUser.update(serverUser.id, { friendly_name: name, notes });
      toast({ title: "User updated" });
      setEditing(false);
      onSaved?.();
    } catch (err) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setName(serverUser.friendly_name || serverUser.username);
    setNotes(serverUser.notes || "");
    setEditing(false);
  };

  const trust = serverUser.trust_score ?? 100;
  const trustColor = trust >= 80 ? "text-lime-400" : trust >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400 text-lg font-bold flex-shrink-0">
          {(serverUser.friendly_name || serverUser.username || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-950 border-zinc-700 text-zinc-100" />
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Admin notes..." className="bg-zinc-950 border-zinc-700 text-zinc-100" />
              <div className="flex gap-2">
                <Button size="sm" onClick={save} disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white gap-1">
                  <Check className="w-3.5 h-3.5" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={cancel} className="border-zinc-700 text-zinc-300">
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-zinc-100">{serverUser.friendly_name || serverUser.username}</h2>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-zinc-400 hover:text-lime-400 h-7 px-2">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-zinc-400">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {serverUser.email || serverUser.username}</span>
                <span className="flex items-center gap-1"><Server className="w-3.5 h-3.5" /> {serverUser.server_name}</span>
                <PlatformBadge platform={serverUser.platform} />
              </div>
              {serverUser.notes && <p className="text-sm text-zinc-500 mt-2 italic">{serverUser.notes}</p>}
            </>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs uppercase tracking-wide justify-end">
            <Shield className="w-3.5 h-3.5" /> Trust
          </div>
          <div className={`text-3xl font-bold ${trustColor}`}>{trust}</div>
        </div>
      </div>
    </div>
  );
}