import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { STREAMING_NETWORKS } from "@/lib/streamingNetworks";

export default function NetworkPickerModal({ open, onOpenChange, selected, onSave }) {
  const [local, setLocal] = useState([]);

  useEffect(() => {
    setLocal(selected || []);
  }, [selected, open]);

  const toggle = (id) => {
    setLocal((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = () => {
    onSave(local);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">My Services & Networks</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-500 -mt-2">
          Select the streaming services and networks you subscribe to. We'll highlight trending content available on your services.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
          {STREAMING_NETWORKS.map((network) => {
            const isSelected = local.includes(network.id);
            return (
              <button
                key={network.id}
                onClick={() => toggle(network.id)}
                className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isSelected
                    ? "border-lime-500/50 bg-lime-500/10"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                <span
                  className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: network.color, color: network.textColor }}
                >
                  {network.name.charAt(0)}
                </span>
                <span className="text-sm font-medium text-zinc-200 truncate">{network.name}</span>
                {isSelected && (
                  <Check className="w-4 h-4 text-lime-400 absolute top-1.5 right-1.5" />
                )}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-300">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-lime-600 hover:bg-lime-700 text-white">
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}