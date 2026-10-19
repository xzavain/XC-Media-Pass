import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Server, RefreshCw, ListChecks, ArrowRight } from "lucide-react";

export default function OnboardingModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-xl">How Watchlist Sync Works</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400 font-bold">1</div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-lime-400" /> Connect Your Media Servers
              </h3>
              <p className="text-sm text-zinc-400">
                Open <span className="text-zinc-200">Sync Settings</span> and link your Plex and/or Emby accounts.
                For <span className="text-zinc-200">Plex</span>, enter your Plex token or user claim token.
                For <span className="text-zinc-200">Emby</span>, provide your server host, username, and API key.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400 font-bold">2</div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-lime-400" /> Choose Your Sync Mode
              </h3>
              <p className="text-sm text-zinc-400">
                Select <span className="text-zinc-200">Bidirectional</span> for 2-way sync (changes on your server
                update here and vice versa), or <span className="text-zinc-200">Push Only</span> to send your
                portal watchlist to your servers without pulling changes back.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400 font-bold">3</div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-lime-400" /> Browse, Discover & Track
              </h3>
              <p className="text-sm text-zinc-400">
                Add movies and shows to your watchlist from the Discover page. Your watchlist automatically syncs
                to your connected Plex and Emby apps. Playback progress is tracked, so you'll always know what
                you've watched and what's next.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-lime-500/10 border border-lime-500/20">
            <p className="text-sm text-zinc-300">
              <span className="text-lime-400 font-semibold">Good to know:</span> Adding content here automatically
              updates your personal apps, tracks what you've already seen, and eliminates manual list updates
              across platforms.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)} className="bg-lime-600 hover:bg-lime-700 text-white">
            Got it <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}