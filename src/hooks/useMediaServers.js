import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Single source of truth for media server connections: the MediaServer
// records managed on the Servers page. Every module reads connections here.
export const MEDIA_SERVERS_KEY = ["media-servers"];

export function useMediaServers() {
  const query = useQuery({
    queryKey: MEDIA_SERVERS_KEY,
    queryFn: () => base44.entities.MediaServer.list(),
    staleTime: 30 * 1000,
  });
  const servers = (query.data || []).filter((s) => s.url && s.api_key);
  return { ...query, servers };
}

// Shape used by the audit / file explorer tools.
export function toSource(s) {
  return { id: s.id, label: s.name, url: s.url, token: s.api_key, platform: s.platform };
}