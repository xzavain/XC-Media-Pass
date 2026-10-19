// In-browser network diagnostic utilities for the Live Node Health hub.

/**
 * Ping a URL multiple times and measure round-trip latency + jitter.
 * Uses no-cors mode (opaque response) — we only care about timing.
 */
export async function pingUrl(url, iterations = 6) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}_${i}`, {
        mode: "no-cors",
        cache: "no-store",
      });
      times.push(performance.now() - start);
    } catch {
      // network error — skip sample
    }
  }
  if (times.length === 0) return { latency: null, jitter: null, samples: [] };
  const valid = times.length > 2 ? times.slice(1) : times; // drop warm-up
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  const jitter =
    valid.length > 1
      ? Math.sqrt(valid.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / valid.length)
      : 0;
  return { latency: Math.round(avg), jitter: Math.round(jitter), samples: valid };
}

/**
 * Measure download throughput via Cloudflare's public speed-test endpoint
 * (CORS-enabled). Falls back gracefully on failure.
 */
export async function measureThroughput(bytes = 25_000_000, url = null) {
  const downloadUrl = url || `https://speed.cloudflare.com/__down?bytes=${bytes}`;
  const start = performance.now();
  try {
    const res = await fetch(downloadUrl, {
      cache: "no-store",
    });
    if (!res.ok) return { mbps: null };
    const reader = res.body?.getReader();
    let totalBytes = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.length;
      }
    } else {
      const blob = await res.blob();
      totalBytes = blob.size;
    }
    const elapsed = (performance.now() - start) / 1000;
    if (totalBytes === 0 || elapsed === 0) return { mbps: null };
    return { mbps: Math.round(((totalBytes * 8) / (elapsed * 1e6)) * 100) / 100 };
  } catch {
    return { mbps: null };
  }
}

/**
 * Detect the current user's ISP, ASN, and geo location via ipwho.is.
 */
export async function detectIspAndGeo() {
  try {
    const res = await fetch("https://ipwho.is/");
    const data = await res.json();
    if (!data.success) return null;
    return {
      ip: data.ip,
      asn: data.connection?.asn ? `AS${data.connection.asn}` : null,
      isp: data.connection?.isp || data.connection?.org || null,
      city: data.city,
      region: data.region,
      country: data.country,
      country_code: data.country_code,
    };
  } catch {
    return null;
  }
}

/**
 * Evaluate connection quality and return a tag with color + description.
 */
export function evaluateConnection(mbps, jitter) {
  if (mbps === null || mbps === undefined)
    return { label: "Test Failed", color: "rose", description: "Unable to measure connection speed." };
  if (mbps >= 80 && (jitter === null || jitter < 40))
    return {
      label: "Ideal for 4K Direct Play",
      color: "emerald",
      description: "Your connection exceeds 80 Mbps with low jitter — perfect for 4K direct play.",
    };
  if (mbps >= 30)
    return {
      label: "Adequate for 1080p Direct Play",
      color: "amber",
      description: "Your connection supports 1080p direct play. 4K may require transcoding.",
    };
  return {
    label: "Connection Unstable / Potential ISP Throttling",
    color: "rose",
    description: "High jitter or low bandwidth detected. Try a wired connection or contact your ISP.",
  };
}

/**
 * Build a plain-text diagnostic report for clipboard copy.
 */
export function buildDiagnosticReport({ server, ping, jitter, mbps, ispInfo, sessions }) {
  const lines = [
    "=== XZAVAIN CLOUD — TECHNICAL DIAGNOSTIC REPORT ===",
    `Generated: ${new Date().toISOString()}`,
    "",
    "--- SERVER EDGE ---",
    `Server: ${server?.name || "N/A"} (${(server?.service_type || "N/A").toUpperCase()})`,
    `Region: ${server?.region || "N/A"}`,
    `Status: ${server?.status || "N/A"}`,
    "",
    "--- NETWORK METRICS ---",
    `Latency: ${ping !== null ? `${ping} ms` : "Failed"}`,
    `Jitter: ${jitter !== null ? `${jitter} ms` : "Failed"}`,
    `Download Speed: ${mbps !== null ? `${mbps} Mbps` : "Failed"}`,
    "",
    "--- ISP / GEO ---",
  ];
  if (ispInfo) {
    lines.push(
      `IP: ${ispInfo.ip || "N/A"}`,
      `ISP: ${ispInfo.isp || "N/A"}`,
      `ASN: ${ispInfo.asn || "N/A"}`,
      `Location: ${ispInfo.city || "N/A"}, ${ispInfo.region || ""} ${ispInfo.country || "N/A"}`
    );
  } else {
    lines.push("ISP detection unavailable");
  }
  if (sessions?.length > 0) {
    lines.push("", "--- ACTIVE SESSIONS ---");
    sessions.forEach((s) => {
      lines.push(
        `  ${s.media_title} — ${s.resolution || "N/A"} — ${s.stream_mode} — ${s.current_bitrate_mbps ?? "N/A"} Mbps`
      );
      if (s.transcode_reason) lines.push(`    Transcode Reason: ${s.transcode_reason}`);
      if (s.is_buffering) lines.push(`    Status: BUFFERING`);
    });
  }
  lines.push("", "=== END REPORT ===");
  return lines.join("\n");
}