import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Link2, Server, Film, Clock, Copy, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { generateInviteToken, calculateExpiry, durationToHours } from "@/lib/mediaServerApi";

const durationOptions = [
  { value: "1_day", label: "1 Day", desc: "24 hours" },
  { value: "2_days", label: "2 Days", desc: "48 hours" },
  { value: "1_week", label: "1 Week", desc: "7 days" },
  { value: "custom", label: "Custom", desc: "Set hours" },
];

export default function CreateInvite() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedLibraries, setSelectedLibraries] = useState([]);
  const [durationType, setDurationType] = useState("1_day");
  const [customHours, setCustomHours] = useState(24);
  const [notes, setNotes] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.MediaServer.list().then(setServers).finally(() => setLoading(false));
  }, []);

  const handleServerSelect = (serverId) => {
    const server = servers.find(s => s.id === serverId);
    setSelectedServer(server);
    setSelectedLibraries([]);
  };

  const toggleLibrary = (lib) => {
    setSelectedLibraries(prev => {
      const exists = prev.find(l => l.id === lib.id);
      return exists ? prev.filter(l => l.id !== lib.id) : [...prev, lib];
    });
  };

  const selectAllLibraries = () => {
    if (!selectedServer) return;
    if (selectedLibraries.length === selectedServer.libraries?.length) {
      setSelectedLibraries([]);
    } else {
      setSelectedLibraries(selectedServer.libraries || []);
    }
  };

  const handleCreate = async () => {
    if (!selectedServer) return;
    setCreating(true);
    try {
      const token = generateInviteToken();
      const hours = durationToHours(durationType, customHours);
      const expiresAt = calculateExpiry(durationType, customHours);

      await base44.entities.Invitation.create({
        token,
        server_id: selectedServer.id,
        server_name: selectedServer.name,
        platform: selectedServer.platform,
        allowed_libraries: selectedLibraries.map(l => ({ id: l.id, name: l.name })),
        duration_type: durationType,
        duration_hours: hours,
        expires_at: expiresAt.toISOString(),
        status: "pending",
        notes,
        max_uses: maxUses,
        use_count: 0,
      });

      await base44.entities.ActivityLog.create({
        action: "invite_created",
        server_id: selectedServer.id,
        platform: selectedServer.platform,
        details: `Invite created for ${selectedServer.name} (${hours}h trial)`,
      });

      const link = `${window.location.origin}/invite/${token}`;
      setGeneratedLink(link);
      toast({ title: "Invitation created!" });
    } catch (err) {
      toast({ title: "Failed to create invite", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (generatedLink) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-zinc-100">Invite Link Created</h2>
            <p className="text-sm text-zinc-500 mt-1">Share this link with the user you want to invite</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={generatedLink}
              readOnly
              className="bg-zinc-800 border-zinc-700 text-zinc-200 font-mono text-sm"
            />
            <Button onClick={handleCopy} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex-shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setGeneratedLink(null); setSelectedServer(null); setSelectedLibraries([]); setNotes(""); }} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Create Another
            </Button>
            <Button onClick={() => navigate("/trials")} className="bg-violet-600 hover:bg-violet-700 text-white">
              View Trials
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-zinc-400 hover:text-zinc-200 -ml-3 mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-heading font-bold text-zinc-100">Create Invitation</h1>
        <p className="text-sm text-zinc-500 mt-1">Generate a time-limited invite link for your media server</p>
      </div>

      {/* Step 1: Select Server */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">1</div>
          Select Server
        </div>
        {!servers.length ? (
          <p className="text-sm text-zinc-500">No servers connected. <button onClick={() => navigate("/servers")} className="text-violet-400 hover:underline">Add one first</button>.</p>
        ) : (
          <div className="grid gap-2">
            {servers.map(s => (
              <button
                key={s.id}
                onClick={() => handleServerSelect(s.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                  ${selectedServer?.id === s.id
                    ? "border-violet-500/40 bg-violet-500/5"
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-800/20"
                  }`}
              >
                <Server className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <span className="text-sm text-zinc-200 font-medium flex-1">{s.name}</span>
                <PlatformBadge platform={s.platform} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Libraries */}
      {selectedServer && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">2</div>
              Select Libraries
            </div>
            {selectedServer.libraries?.length > 0 && (
              <button onClick={selectAllLibraries} className="text-xs text-violet-400 hover:text-violet-300">
                {selectedLibraries.length === selectedServer.libraries?.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>
          {!selectedServer.libraries?.length ? (
            <p className="text-sm text-zinc-500">No libraries found. Try syncing the server.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedServer.libraries.map(lib => {
                const selected = selectedLibraries.some(l => l.id === lib.id);
                return (
                  <label
                    key={lib.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${selected
                        ? "border-violet-500/40 bg-violet-500/5"
                        : "border-zinc-800 hover:border-zinc-700 bg-zinc-800/20"
                      }`}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleLibrary(lib)}
                      className="border-zinc-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                    />
                    <Film className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-zinc-300">{lib.name}</p>
                      <p className="text-xs text-zinc-600 capitalize">{lib.type}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Duration */}
      {selectedServer && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">3</div>
            Trial Duration
          </div>
          <RadioGroup value={durationType} onValueChange={setDurationType} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {durationOptions.map(d => (
              <label
                key={d.value}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-all text-center
                  ${durationType === d.value
                    ? "border-violet-500/40 bg-violet-500/5"
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-800/20"
                  }`}
              >
                <RadioGroupItem value={d.value} className="sr-only" />
                <Clock className={`w-4 h-4 ${durationType === d.value ? "text-violet-400" : "text-zinc-500"}`} />
                <span className="text-sm font-medium text-zinc-200">{d.label}</span>
                <span className="text-xs text-zinc-500">{d.desc}</span>
              </label>
            ))}
          </RadioGroup>
          {durationType === "custom" && (
            <div className="max-w-xs">
              <Label className="text-zinc-300 text-sm">Hours</Label>
              <Input
                type="number"
                min={1}
                value={customHours}
                onChange={e => setCustomHours(Number(e.target.value))}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 4: Options */}
      {selectedServer && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">4</div>
            Options
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-300 text-sm">Max Uses</Label>
              <Input
                type="number"
                min={1}
                value={maxUses}
                onChange={e => setMaxUses(Number(e.target.value))}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-zinc-300 text-sm">Notes (optional)</Label>
            <Textarea
              placeholder="Internal notes about this invite..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1 resize-none"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Create Button */}
      {selectedServer && (
        <Button
          onClick={handleCreate}
          disabled={creating}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white h-12 text-base"
        >
          {creating ? "Generating..." : "Generate Invite Link"}
        </Button>
      )}
    </div>
  );
}