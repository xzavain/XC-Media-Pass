// Maps a raw resolution string (e.g. "1920x1080", "2160p") to a display quality bucket.
export function qualityBucket(resolution) {
  if (!resolution) return "Unknown";
  const match = resolution.match(/(\d+)/g);
  const height = match ? Math.max(...match.map(Number)) : 0;
  if (height >= 2000) return "4K";
  if (height >= 1000) return "1080p";
  if (height >= 700) return "720p";
  if (height > 0) return "SD";
  return "Unknown";
}