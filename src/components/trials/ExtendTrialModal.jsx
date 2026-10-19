import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { durationToHours } from "@/lib/mediaServerApi";

const durations = [
  { value: "1_day", label: "1 Day", hours: 24 },
  { value: "2_days", label: "2 Days", hours: 48 },
  { value: "1_week", label: "1 Week", hours: 168 },
  { value: "custom", label: "Custom", hours: null },
];

export default function ExtendTrialModal({ open, onOpenChange, invitation, onExtended }) {
  const [durationType, setDurationType] = useState("1_day");
  const [customHours, setCustomHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExtend = async () => {
    setLoading(true);
    try {
      const hours = durationToHours(durationType, customHours);
      const currentExpiry = new Date(invitation.expires_at);
      const now = new Date();
      const baseTime = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(baseTime.getTime() + hours * 60 * 60 * 1000);

      await base44.entities.Invitation.update(invitation.id, {
        expires_at: newExpiry.toISOString(),
        status: "active",
      });

      await base44.entities.ActivityLog.create({
        action: "trial_extended",
        invitation_id: invitation.id,
        server_id: invitation.server_id,
        username: invitation.username || invitation.email,
        platform: invitation.platform,
        details: `Trial extended by ${hours}h for ${invitation.username || invitation.email}`,
      });

      toast({ title: "Trial extended", description: `New expiry: ${newExpiry.toLocaleString()}` });
      onExtended?.();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Failed to extend trial", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!invitation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Clock className="w-5 h-5 text-violet-400" />
            Extend Trial
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Extend the trial for <strong className="text-zinc-300">{invitation.username || invitation.email || "this user"}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-zinc-300 text-sm">Current Expiry</Label>
            <p className="text-sm text-zinc-400 mt-1">
              {new Date(invitation.expires_at).toLocaleString()}
            </p>
          </div>

          <div>
            <Label className="text-zinc-300 text-sm mb-3 block">Add Duration</Label>
            <RadioGroup value={durationType} onValueChange={setDurationType} className="grid grid-cols-2 gap-2">
              {durations.map(d => (
                <label
                  key={d.value}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm
                    ${durationType === d.value 
                      ? "border-violet-500/40 bg-violet-500/10 text-violet-300" 
                      : "border-zinc-800 bg-zinc-800/30 text-zinc-400 hover:border-zinc-700"
                    }`}
                >
                  <RadioGroupItem value={d.value} className="border-zinc-600" />
                  {d.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {durationType === "custom" && (
            <div>
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

          <Button
            onClick={handleExtend}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            {loading ? "Extending..." : "Extend Trial"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}