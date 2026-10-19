import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Paperclip, X, Loader2, Image as ImageIcon } from "lucide-react";

export default function AttachmentUploader({ attachments, onChange }) {
  const [uploading, setUploading] = useState([]);

  const handleFile = async (file) => {
    setUploading((u) => [...u, file.name]);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange([...attachments, { name: file.name, url: file_url, type: file.type }]);
    } catch {
      // best-effort
    } finally {
      setUploading((u) => u.filter((n) => n !== file.name));
    }
  };

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs bg-zinc-800 rounded-md px-2 py-1">
              {a.type?.startsWith("image/") ? (
                <ImageIcon className="w-3 h-3 text-lime-400" />
              ) : (
                <Paperclip className="w-3 h-3 text-zinc-400" />
              )}
              <a href={a.url} target="_blank" rel="noreferrer" className="text-zinc-300 truncate max-w-[120px]">{a.name}</a>
              <button type="button" onClick={() => onChange(attachments.filter((_, idx) => idx !== i))}>
                <X className="w-3 h-3 text-zinc-500 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
      {uploading.map((name) => (
        <div key={name} className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Uploading {name}...
        </div>
      ))}
      <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200 w-fit">
        <Paperclip className="w-3.5 h-3.5" />
        Attach file or screenshot
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            Array.from(e.target.files).forEach(handleFile);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}