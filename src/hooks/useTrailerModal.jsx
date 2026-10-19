import { useState, useCallback } from "react";
import TrailerPlayerModal from "@/components/trailers/TrailerPlayerModal";

export function useTrailerModal() {
  const [state, setState] = useState({ open: false, tmdbId: null, mediaType: "movie", title: "" });

  const openTrailer = useCallback(({ tmdbId, mediaType, title }) => {
    setState({ open: true, tmdbId, mediaType, title });
  }, []);

  const modal = (
    <TrailerPlayerModal
      open={state.open}
      onOpenChange={(v) => !v && setState((s) => ({ ...s, open: false }))}
      tmdbId={state.tmdbId}
      mediaType={state.mediaType}
      title={state.title}
    />
  );

  return { openTrailer, modal };
}