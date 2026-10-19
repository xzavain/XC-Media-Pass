import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileText } from "lucide-react";
import { embyGetFileProperties, plexFindItemByPath } from "@/lib/auditApi";

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDuration(ms) {
  if (!ms) return "—";
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

function formatBitrate(kbps) {
  if (!kbps) return "—";
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${kbps} kbps`;
}

function Row({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-zinc-800/50 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}

export default function FilePropertiesModal({ file, source, libraryRoots, onClose }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!file || !source) return;
    let cancelled = false;
    setLoading(true);
    setInfo(null);

    (async () => {
      try {
        let result = null;
        if (source.platform === "plex") {
          const root = (libraryRoots || [])
            .filter((r) => r.sectionId && file.path.startsWith(r.path))
            .sort((a, b) => b.path.length - a.path.length)[0];
          if (root) {
            result = await plexFindItemByPath(source.url, source.token, root.sectionId, root.sectionType, file.path);
          }
        } else {
          result = await embyGetFileProperties(source.url, source.token, file.path);
        }
        if (!cancelled) setInfo(result);
      } catch {
        if (!cancelled) setInfo(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [file, source, libraryRoots]);

  if (!file) return null;

  const ext = file.name.split(".").pop()?.toUpperCase();

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span className="truncate">{file.name}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm py-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading media info…
          </div>
        ) : (
          <div className="space-y-0.5">
            <Row label="Path" value={file.path} />
            <Row label="Type" value={info?.container ? `${ext} (${info.container.toUpperCase()})` : `${ext} File`} />
            <Row label="Size" value={formatBytes(info?.size ?? file.size)} />
            <Row label="Duration" value={info?.duration ? formatDuration(info.duration) : null} />
            <Row label="Bitrate" value={info?.bitrate ? formatBitrate(info.bitrate) : null} />

            {info?.video && (
              <>
                <p className="text-xs text-zinc-600 uppercase tracking-wider pt-3 pb-1">Video</p>
                <Row label="Codec" value={info.video.codec?.toUpperCase()} />
                <Row
                  label="Resolution"
                  value={info.video.resolution || (info.video.width && info.video.height ? `${info.video.width}x${info.video.height}` : null)}
                />
                <Row label="Frame Rate" value={info.video.frameRate ? `${parseFloat(info.video.frameRate).toFixed(2)} fps` : null} />
              </>
            )}

            {info?.audio && (
              <>
                <p className="text-xs text-zinc-600 uppercase tracking-wider pt-3 pb-1">Audio</p>
                <Row label="Codec" value={info.audio.codec?.toUpperCase()} />
                <Row label="Channels" value={info.audio.channels} />
                <Row label="Language" value={info.audio.language} />
              </>
            )}

            {!info && (
              <p className="text-xs text-zinc-600 pt-3">
                This file isn't indexed by the media server's library, so detailed media info isn't available.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}