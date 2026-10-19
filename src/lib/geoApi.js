// Lightweight IP geolocation lookup with an in-memory cache.
// Private/local IPs are skipped immediately (they never resolve).
// Tries ipwho.is first (returns ASN/org/postal), falling back to ipapi.co.
const cache = new Map();

function isPrivateIp(ip) {
  if (!ip) return true;
  const clean = ip.split(":")[0];
  if (/^(10\.|192\.168\.|169\.254\.|127\.|0\.0\.0\.0)/.test(clean)) return true;
  const m = clean.match(/^172\.(\d+)\./);
  if (m && +m[1] >= 16 && +m[1] <= 31) return true;
  if (clean === "::1" || clean === "") return true;
  return false;
}

async function lookupIpwhois(ip) {
  const res = await fetch(`https://ipwho.is/${ip}`);
  if (!res.ok) throw new Error("ipwho.is failed");
  const data = await res.json();
  if (!data.success || data.latitude == null) throw new Error("ipwho.is no data");
  return {
    lat: data.latitude,
    lon: data.longitude,
    city: data.city,
    region: data.region,
    country: data.country,
    country_code: data.country_code,
    postal: data.postal,
    asn: data.connection?.asn ? `AS${data.connection.asn}` : null,
    org: data.connection?.org || data.connection?.isp || null,
    isp: data.connection?.isp || null,
  };
}

async function lookupIpapi(ip) {
  const res = await fetch(`https://ipapi.co/${ip}/json/`);
  if (!res.ok) throw new Error("ipapi failed");
  const data = await res.json();
  if (data.error || !data.latitude) throw new Error("ipapi no data");
  const asnMatch = (data.asn || "").match(/AS(\d+)/);
  return {
    lat: data.latitude,
    lon: data.longitude,
    city: data.city,
    region: data.region,
    country: data.country_name,
    country_code: data.country_code,
    postal: data.postal,
    asn: asnMatch ? `AS${asnMatch[1]}` : (data.asn || null),
    org: data.org || null,
    isp: data.org || null,
  };
}

export async function getLocation(ip) {
  if (!ip) return null;
  const cleanIp = ip.split(":")[0];
  if (isPrivateIp(cleanIp)) return null;
  if (cache.has(cleanIp)) return cache.get(cleanIp);

  try {
    const loc = await lookupIpwhois(cleanIp);
    cache.set(cleanIp, loc);
    return loc;
  } catch {
    try {
      const loc = await lookupIpapi(cleanIp);
      cache.set(cleanIp, loc);
      return loc;
    } catch {
      cache.set(cleanIp, null);
      return null;
    }
  }
}