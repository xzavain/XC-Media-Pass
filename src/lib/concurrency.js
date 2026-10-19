// Run an async mapper over items with a bounded number of concurrent operations.
// Keeps third-party API load gentle by avoiding large bursts of parallel requests
// against Plex/Emby/Jellyfin servers during library scans.
export async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}