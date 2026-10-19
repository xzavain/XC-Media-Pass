import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

function detectType(file) {
  if (file.type === "image/gif") return "gif";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf" || file.type.includes("document") || file.type.includes("sheet")) return "document";
  return "other";
}

export default function AssetUploader({ user, category = "General", onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.KbAsset.create({
        file_name: file.name,
        file_url,
        file_type: detectType(file),
        file_size: file.size,
        category,
        uploaded_by_name: user?.full_name,
        uploaded_by_email: user?.email,
      });
      onUploaded();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" onChange={handleChange} className="hidden" />
      <Button
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="bg-lime-600 hover:bg-lime-700 text-white gap-1.5"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Upload File
      </Button>
    </div>
  );
}