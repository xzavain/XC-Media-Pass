import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Ban } from "lucide-react";
import { killSession } from "@/lib/sessionsApi";
import { useToast } from "@/components/ui/use-toast";
import PredefinedMessageList from "@/components/sessions/PredefinedMessageList";

export default function BulkKillDialog({ open, onOpenChange, items, onKilled }) {
  const [message, setMessage] = useState("This stream has been stopped by an administrator.");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleKill = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        items.map(({ session, server }) => killSession(server, session, message))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed) {
        toast({ title: `${failed} of ${items.length} streams failed to stop`, variant: "destructive" });
      } else {
        toast({ title: `Stopped ${items.length} stream${items.length !== 1 ? "s" : ""}` });
      }
      onOpenChange(false);
      onKilled?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Stop {items.length} stream{items.length !== 1 ? "s" : ""}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-500">This message will be displayed to each user before their stream is terminated.</p>
        <PredefinedMessageList onSelect={setMessage} />
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100"
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Cancel
          </Button>
          <Button onClick={handleKill} disabled={loading || items.length === 0} className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
            Stop {items.length} Stream{items.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}