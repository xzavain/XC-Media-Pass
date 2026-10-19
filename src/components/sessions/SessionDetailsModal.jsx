import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PlatformBadge from "@/components/shared/PlatformBadge";
import SessionsMap from "@/components/sessions/SessionsMap";
import { MapPin } from "lucide-react";
import { getLocation } from "@/lib/geoApi";

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-zinc-200 mt-0.5">{value || "—"}</p>
    </div>
  );
}

function formatTime(totalSeconds) {
  if (!totalSeconds && totalSeconds !== 0) return null;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function SessionDetailsModal({ open, onOpenChange, session }) {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (!open || !session?.ip_address) {
      setLocation(null);
      return;
    }
    let cancelled = false;
    getLocation(session.ip_address).then((loc) => {
      if (!cancelled) setLocation(loc);
    });
    return () => { cancelled = true; };
  }, [open, session?.ip_address]);

  if (!session) return null;

  const isTranscode = session.transcode_decision === "transcode";
  const elapsed = formatTime(session.elapsed_seconds);
  const duration = formatTime(session.duration_seconds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlatformBadge platform={session.platform} /> {session.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <Detail label="User" value={session.username} />
          <Detail label="Server" value={session.server_name} />
          <Detail label="Device" value={session.device} />
          <Detail label="Client App" value={session.client_app} />
          <Detail label="App Version" value={session.client_version} />
          <Detail label="IP Address" value={session.ip_address} />
          <Detail
            label="Location"
            value={location ? `${location.city ? location.city + ", " : ""}${location.country}` : (session.ip_address ? "Unavailable" : null)}
          />
          <Detail label="Progress" value={elapsed && duration ? `${elapsed} / ${duration} (${session.progress_percent}%)` : `${session.progress_percent}%`} />
        </div>

        <div className="border-t border-zinc-800 pt-4 grid grid-cols-2 gap-4">
          <Detail label="Play Method" value={session.play_method === "DirectPlay" ? "Direct Play" : session.play_method} />
          <Detail label="Transcode Reason" value={session.transcode_reason} />
          {isTranscode ? (
            <>
              <Detail label="Source Video" value={[session.source_video_codec, session.source_resolution].filter(Boolean).join(" · ")} />
              <Detail label="Stream Video" value={[session.video_codec, session.resolution].filter(Boolean).join(" · ")} />
              <Detail label="Source Bitrate" value={session.source_bitrate ? `${session.source_bitrate} kbps` : null} />
              <Detail label="Stream Bitrate" value={session.bitrate ? `${session.bitrate} kbps` : null} />
            </>
          ) : (
            <>
              <Detail label="Video Codec" value={session.video_codec} />
              <Detail label="Resolution" value={session.resolution} />
              <Detail label="Bitrate" value={session.bitrate ? `${session.bitrate} kbps` : null} />
            </>
          )}
          <Detail label="Audio Codec" value={session.audio_codec} />
          <Detail label="Audio Channels" value={session.audio_channels} />
          <Detail label="Container" value={session.container} />
          <Detail label="Subtitle" value={session.subtitle} />
        </div>

        {location && (
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1 mb-2">
              <MapPin className="w-3 h-3" /> Stream Location
            </p>
            <div className="rounded-lg overflow-hidden" style={{ height: 200 }}>
              <SessionsMap sessions={[session]} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}