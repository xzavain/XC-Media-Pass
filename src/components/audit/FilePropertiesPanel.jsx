import React, { useEffect, useState } from "react";
import { Loader2, FileText, X } from "lucide-react";
import { embyGetFileProperties, plexFindItemByPath } from "@/lib/auditApi";
import { formatBytes } from "@/lib/fileUtils";

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
    <div className="flex justify-between py-1.5 border-b border-zinc-800/50 text-sm gap-3">
      <span className="text-zinc-500 flex-shrink-0">{label}</span>
      <span className="text-zinc-200 text-right break-all min-w-0">{value}</span>
    </div>
  );
}

// Tautulli/Tracearr-style slide-out panel on the right side of the screen.
// The body scrolls independently so long media info never overflows the panel.
export default function FilePropertiesPanel({ file, source, libraryRoots, onClose }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (file) {
      setShow(false);
      const t = setTimeout(() => setShow(true), 10);
      return () => clearTimeout(t);
    }
  }, [file]);

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
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`relative h-full w-[420px] max-w-full bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${show ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span className="text-sm font-medium text-zinc-100 truncate">{file.name}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
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
        </div>
      </div>
    </div>
  );
}