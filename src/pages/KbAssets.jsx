import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import AssetGrid from "@/components/kb/AssetGrid";
import AssetUploader from "@/components/kb/AssetUploader";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

export default function KbAssets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const list = await base44.entities.KbAsset.list("-created_date", 300);
    setAssets(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = assets.filter((a) => a.file_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <button onClick={() => navigate("/kb")} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Knowledge Base
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-zinc-100">Asset Manager</h1>
          <p className="text-sm text-zinc-500 mt-1">Global file repository — images, GIFs, videos, and documents shared across the app</p>
        </div>
        <AssetUploader user={user} onUploaded={load} />
      </div>

      <Input
        placeholder="Search files..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-zinc-800 border-zinc-700 text-zinc-100 max-w-sm"
      />

      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading files...</p>
      ) : (
        <AssetGrid assets={filtered} />
      )}
    </div>
  );
}