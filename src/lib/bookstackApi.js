// BookStack REST API client — read-only fetcher for migration ingestion.
//
// BookStack API reference (built-in at {instance}/api/docs):
//   Auth:  Authorization: Token {token_id}:{token_secret}
//   List:  GET /api/{resource}?count=N&offset=M  → { data: [...], total: n }
//   Read:  GET /api/{resource}/{id}
//
// This client is READ-ONLY — it never POSTs/PUTs/DELETEs to the source
// instance, guaranteeing the migration is non-destructive.

const DEFAULT_COUNT = 100;

/**
 * Create a BookStack API client.
 * @param {string} baseUrl  - e.g. "https://wiki.example.com" (no trailing slash)
 * @param {string} tokenId  - API token ID
 * @param {string} tokenSecret - API token secret
 */
export function createBookStackClient(baseUrl, tokenId, tokenSecret, corsProxy = "") {
  const apiBase = baseUrl.replace(/\/+$/, "") + "/api";
  const authHeader = `Token ${tokenId}:${tokenSecret}`;

  // Wrap a target URL with the CORS proxy if one is configured.
  // Browsers block direct cross-origin requests to external BookStack
  // instances; routing through a proxy like corsproxy.io avoids the CORS
  // preflight rejection while still forwarding the Authorization header.
  function proxied(targetUrl) {
    if (!corsProxy) return targetUrl;
    // If the proxy template contains {url}, substitute with encoded URL.
    if (corsProxy.includes("{url}")) return corsProxy.replace("{url}", encodeURIComponent(targetUrl));
    // Prepend-style proxy (e.g. "https://proxy.cors.sh/"): append raw URL.
    if (corsProxy.endsWith("/")) return corsProxy + targetUrl;
    // Query-style proxy (e.g. "https://corsproxy.io/?url="): append encoded URL.
    return corsProxy + "?url=" + encodeURIComponent(targetUrl);
  }

  async function request(path, params = {}) {
    const url = new URL(apiBase + path);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch(proxied(url.toString()), {
          headers: { Authorization: authHeader, Accept: "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`BookStack API ${res.status}: ${body || res.statusText}`);
        }
        return await res.json();
      } catch (e) {
        clearTimeout(timeout);
        lastErr = e;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw lastErr;
  }

  /** Paginate through a list endpoint, accumulating all `data` items. */
  async function listAll(resource, onProgress) {
    const all = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
      const page = await request(resource, { count: DEFAULT_COUNT, offset });
      total = page.total ?? all.length;
      all.push(...(page.data || []));
      offset += DEFAULT_COUNT;
      if (onProgress) onProgress(all.length, total);
    }
    return all;
  }

  return {
    // --- Connectivity test ---
    async testConnection() {
      try {
        const page = await request("/books", { count: 1, offset: 0 });
        return { ok: true, total: page.total ?? 0 };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    // --- Shelves ---
    listShelves: (onProgress) => listAll("/shelves", onProgress),
    getShelf: (id) => request(`/shelves/${id}`),

    // --- Books ---
    listBooks: (onProgress) => listAll("/books", onProgress),
    getBook: (id) => request(`/books/${id}`),

    // --- Chapters ---
    listChapters: (onProgress) => listAll("/chapters", onProgress),
    getChapter: (id) => request(`/chapters/${id}`),

    // --- Pages ---
    listPages: (onProgress) => listAll("/pages", onProgress),
    getPage: (id) => request(`/pages/${id}`),

    // --- Search (for finding specific content) ---
    search: (query) => request("/search", { query }),

    // Expose the proxy wrapper so the migration engine can re-host images
    // through the same CORS proxy used for API calls.
    proxiedUrl: proxied,
  };
}