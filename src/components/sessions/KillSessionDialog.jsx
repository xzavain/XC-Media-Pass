import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Ban } from "lucide-react";
import { killSession } from "@/lib/sessionsApi";
import { useToast } from "@/components/ui/use-toast";
import PredefinedMessageList from "@/components/sessions/PredefinedMessageList";

export default function KillSessionDialog({ open, onOpenChange, server, session, onKilled }) {
  const [message, setMessage] = useState("This stream has been stopped by an administrator.");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleKill = async () => {
    setLoading(true);
    try {
      await killSession(server, session, message);
      toast({ title: "Stream stopped" });
      onOpenChange(false);
      onKilled?.();
    } catch (err) {
      toast({ title: "Failed to stop stream", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Stop stream for {session?.username}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-500">A message will be displayed to the user before their stream is terminated.</p>
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
          <Button onClick={handleKill} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
            Stop Stream
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}