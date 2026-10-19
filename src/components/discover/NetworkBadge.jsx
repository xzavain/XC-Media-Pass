import { getNetworkByName } from "@/lib/streamingNetworks";

export default function NetworkBadge({ provider, size = "sm" }) {
  const network = getNetworkByName(provider);
  if (!network) {
    return (
      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-800 text-zinc-300 ${size === "sm" ? "" : "text-xs px-2 py-1"}`}>
        {provider}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${size === "sm" ? "" : "text-xs px-2 py-1"}`}
      style={{ backgroundColor: network.color, color: network.textColor }}
    >
      {network.name}
    </span>
  );
}