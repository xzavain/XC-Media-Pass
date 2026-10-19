import { useEffect } from "react";

export default function DiscordCallback() {
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = fragment.get("access_token");
    const state = fragment.get("state");
    const error = fragment.get("error");
    const errorDescription = fragment.get("error_description");

    if (error) {
      window.opener?.postMessage({ type: "DISCORD_LINKED_ERROR", error: errorDescription || error }, "*");
    } else if (accessToken) {
      window.opener?.postMessage({ type: "DISCORD_LINKED_SUCCESS", accessToken, state }, "*");
    } else {
      window.opener?.postMessage({ type: "DISCORD_LINKED_ERROR", error: "No access token received." }, "*");
    }

    // Close the popup after a brief delay so the message is delivered
    setTimeout(() => window.close(), 100);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-400 gap-2">
      <div className="w-6 h-6 border-2 border-slate-700 border-t-[#5865F2] rounded-full animate-spin" />
      <p className="text-sm">Completing Discord authorization...</p>
    </div>
  );
}