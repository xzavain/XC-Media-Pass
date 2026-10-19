import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Power, Loader2 } from "lucide-react";

const REASONS = [
  "Free up slot for this room",
  "Device left streaming unattended",
  "Unrecognized IP / Security Concern",
];

export default function KillStreamModal({ session, open, onOpenChange, onConfirm }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [sendToast, setSendToast] = useState(true);
  const [killing, setKilling] = useState(false);

  const handleConfirm = async () => {
    setKilling(true);
    try {
      await onConfirm(reason, sendToast);
      onOpenChange(false);
    } finally {
      setKilling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-rose-400 flex items-center gap-2">
            <Power className="w-4 h-4" /> Terminate Stream
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-400">
            You are about to terminate playback on <span className="text-white font-semibold">{session?.device_name}</span>
            {session?.media_title && <> playing <span className="text-white font-semibold">{session.media_title}</span></>}.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {REASONS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <Switch checked={sendToast} onCheckedChange={setSendToast} />
            Send toast notification to device: "Session stopped via Customer Portal."
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 text-slate-300">Cancel</Button>
          <Button onClick={handleConfirm} disabled={killing} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
            {killing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
            Terminate Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}