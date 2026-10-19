import React from "react";
import { Smartphone, Monitor, Tv, Gamepad2, Apple } from "lucide-react";

const CLIENT_CONFIG = {
  apple_tv: { label: "Apple TV", icon: Apple },
  ios: { label: "iOS", icon: Smartphone },
  android: { label: "Android", icon: Smartphone },
  android_tv: { label: "Android TV", icon: Tv },
  roku: { label: "Roku", icon: Tv },
  tizen: { label: "Tizen", icon: Tv },
  webos: { label: "WebOS", icon: Tv },
  kodi: { label: "Kodi", icon: Monitor },
  steam: { label: "Steam", icon: Gamepad2 },
  web: { label: "Web", icon: Monitor },
};

export function detectClient(clientApp, player, device) {
  const raw = `${clientApp || ""} ${player || ""} ${device || ""}`.toLowerCase();
  if (raw.includes("apple") && raw.includes("tv")) return "apple_tv";
  if (raw.includes("ios") || raw.includes("iphone") || raw.includes("ipad")) return "ios";
  if (raw.includes("android tv") || raw.includes("shield") || raw.includes("fire tv") || raw.includes("nvidia")) return "android_tv";
  if (raw.includes("android")) return "android";
  if (raw.includes("roku")) return "roku";
  if (raw.includes("tizen") || raw.includes("samsung")) return "tizen";
  if (raw.includes("webos") || raw.includes("lg")) return "webos";
  if (raw.includes("kodi")) return "kodi";
  if (raw.includes("steam")) return "steam";
  return "web";
}

export default function ClientBadge({ clientApp, player, device }) {
  const key = detectClient(clientApp, player, device);
  const config = CLIENT_CONFIG[key] || { label: key, icon: Monitor };
  const Icon = config.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-xs font-medium text-zinc-300">
      <Icon className="w-3 h-3" /> {config.label}
    </span>
  );
}