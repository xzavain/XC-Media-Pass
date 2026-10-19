import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AssetGrid from "@/components/kb/AssetGrid";
import AssetUploader from "@/components/kb/AssetUploader";

export default function AssetPickerModal({ user, open, onOpenChange, onPick }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await base44.entities.KbAsset.list("-created_date", 100);
    setAssets(list);
    setLoading(false);
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Insert Media</DialogTitle></DialogHeader>
        <div className="mb-3">
          <AssetUploader user={user} onUploaded={load} />
        </div>
        {loading ? (
          <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
        ) : (
          <AssetGrid assets={assets} onSelect={(a) => { onPick(a); onOpenChange(false); }} />
        )}
      </DialogContent>
    </Dialog>
  );
}