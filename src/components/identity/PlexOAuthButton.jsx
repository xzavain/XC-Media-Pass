import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Link2, Unlink, ExternalLink } from "lucide-react";
import { createPlexPin, pollPlexPin, getPlexAuthUrl, getPlexIdentity } from "@/lib/universalIdentityApi";

export default function PlexOAuthButton({ identity, onConnected, onDisconnect }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authUrl, setAuthUrl] = useState(null);
  const pollRef = useRef(null);
  const popupRef = useRef(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const pin = await createPlexPin();
      const url = getPlexAuthUrl(pin.code);
      setAuthUrl(url);
      popupRef.current = window.open(url, "_blank", "width=480,height=720");

      let attempts = 0;
      const poll = async () => {
        attempts++;
        if (attempts > 90) {
          clearInterval(pollRef.current);
          setLoading(false);
          setError("Authentication timed out. Please try again.");
          return;
        }
        try {
          const pinData = await pollPlexPin(pin.id);
          if (pinData.authToken) {
            clearInterval(pollRef.current);
            const plexUser = await getPlexIdentity(pinData.authToken);
            await onConnected({
              plex_connected: true,
              plex_username: plexUser.username,
              plex_email: plexUser.email,
              plex_user_uuid: plexUser.uuid,
              plex_auth_token: pinData.authToken,
              last_sync_timestamp: new Date().toISOString(),
            });
            setLoading(false);
            setAuthUrl(null);
            if (popupRef.current) popupRef.current.close();
          }
        } catch {}
      };
      pollRef.current = setInterval(poll, 2000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  if (identity?.plex_connected) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{identity.plex_username || "Plex User"}</p>
            <p className="text-xs text-amber-400">🟢 Plex Connected</p>
          </div>
        </div>
        <Button onClick={onDisconnect} variant="outline" size="sm" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-1.5">
          <Unlink className="w-3.5 h-3.5" /> Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleConnect} disabled={loading} className="w-full gap-2 text-white" style={{ background: "#e5a00d" }}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        {loading ? "Waiting for Plex authorization..." : "Login with Plex"}
      </Button>
      {loading && authUrl && (
        <a href={authUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-400 flex items-center gap-1 hover:underline">
          <ExternalLink className="w-3 h-3" /> Popup blocked? Click here to open Plex login
        </a>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}