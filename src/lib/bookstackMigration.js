// BookStack → local KB migration engine.
//
// One-way, non-destructive import pipeline (idempotent):
//   1. Fetch all shelves, books, chapters, pages from the BookStack API.
//   2. Match existing local records by slug — update if content changed,
//      create if missing. Never duplicates or overwrites unchanged records.
//   3. For each page, parse HTML for embedded media (images, videos, links,
//      and base64 data URIs), download, re-host via UploadFile, and rewrite
//      URLs. Assets are matched by external_url so re-runs skip already-
//      imported media.
//   4. Large page content that exceeds the entity field limit is offloaded
//      to an uploaded HTML file; the file URL is stored in content_url.
//   5. Create KbPageRevision records for new and updated pages.
//   6. Track the entire run in KbMigrationLog with per-item error details.
//
// The engine NEVER writes back to the source BookStack instance — it only
// reads via the API client. All writes go to this platform's own database.

import { createBookStackClient } from "./bookstackApi";
import { base44 } from "@/api/base44Client";

// --- Helpers ---

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function mapTags(bookstackTags) {
  return (bookstackTags || []).map((t) => t.name || t.value || t.key || String(t)).filter(Boolean);
}

function detectFileType(url, contentType) {
  const ext = (url || "").split("?")[0].split(".").pop().toLowerCase();
  if (contentType?.includes("gif") || ext === "gif") return "gif";
  if (contentType?.includes("video") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (contentType?.includes("pdf") || ["pdf", "doc", "docx", "txt", "xls", "xlsx"].includes(ext)) return "document";
  if (contentType?.includes("image") || ["png", "jpg", "jpeg", "webp", "svg", "avif", "tiff", "bmp"].includes(ext)) return "image";
  return "other";
}

function extractFileName(url) {
  const path = (url || "").split("?")[0].split("#")[0];
  return path.split("/").pop() || "asset";
}

// Retry an async operation with exponential backoff for transient failures.
async function withRetry(fn, retries = 3, baseDelay = 1500) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, baseDelay * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

const MEDIA_EXTENSIONS = [
  "png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "tiff", "bmp",
  "mp4", "webm", "mov", "avi", "mkv", "mp3", "wav", "ogg", "m4a",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip", "rar",
];

// Parse HTML content for embedded media URLs (images, videos, audio, file links).
function extractMediaUrls(html, sourceBaseUrl) {
  if (!html) return [];
  const urls = new Set();
  let match;

  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    if (!match[1].startsWith("data:")) urls.add(match[1]);
  }

  const sourceRegex = /<(?:video|source|audio|embed)[^>]+src=["']([^"']+)["']/gi;
  while ((match = sourceRegex.exec(html)) !== null) {
    if (!match[1].startsWith("data:")) urls.add(match[1]);
  }

  const aRegex = /<a[^>]+href=["']([^"']+)["']/gi;
  while ((match = aRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith(sourceBaseUrl) || href.startsWith("/") || href.startsWith("http")) {
      const ext = href.split("?")[0].split(".").pop().toLowerCase();
      if (MEDIA_EXTENSIONS.includes(ext) || href.includes("/uploads/") || href.includes("/files/")) {
        urls.add(href);
      }
    }
  }

  return [...urls];
}

// Extract base64 data URIs from <img src="data:..."> tags.
function extractBase64Images(html) {
  if (!html) return [];
  const urls = [];
  const regex = /src=["'](data:(?:image|video|audio)\/[^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

// Simple hash for dedup key (not cryptographic — just to avoid re-hosting identical base64).
function hashDataUri(dataUri) {
  let hash = 0;
  for (let i = 0; i < dataUri.length; i++) {
    hash = ((hash << 5) - hash) + dataUri.charCodeAt(i);
    hash |= 0;
  }
  return `base64:${Math.abs(hash).toString(36)}`;
}

function resolveUrl(src, sourceBaseUrl) {
  if (src.startsWith("http")) return src;
  if (src.startsWith("//")) return "https:" + src;
  if (src.startsWith("/")) return sourceBaseUrl.replace(/\/+$/, "") + src;
  return src;
}

// Download a file as a Blob, then upload it to this platform's storage.
async function downloadAndRehost(imgUrl, sourceBaseUrl, authHeader, proxiedUrl) {
  const resolvedUrl = resolveUrl(imgUrl, sourceBaseUrl);
  const fetchUrl = proxiedUrl ? proxiedUrl(resolvedUrl) : resolvedUrl;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(fetchUrl, {
      headers: authHeader ? { Authorization: authHeader } : {},
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const blob = await res.blob();
    const file = new File([blob], extractFileName(resolvedUrl), {
      type: blob.type || "application/octet-stream",
    });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return { file_url, blob, originalUrl: imgUrl, resolvedUrl };
  } finally {
    clearTimeout(timeout);
  }
}

// Re-host a base64 data URI as a file.
async function rehostBase64(dataUri) {
  const res = await fetch(dataUri);
  const blob = await res.blob();
  const ext = (blob.type || "image/png").split("/")[1] || "png";
  const file = new File([blob], `embedded-${Date.now()}.${ext}`, { type: blob.type });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return { file_url, blob };
}

// Rewrite all media URLs in HTML from BookStack URLs to re-hosted URLs.
function rewriteMediaUrls(html, urlMap) {
  if (!html || urlMap.size === 0) return html || "";
  let result = html;
  for (const [originalUrl, newUrl] of urlMap) {
    const escaped = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), newUrl);
  }
  return result;
}

// Try to create a page; if content exceeds the entity field limit, offload
// it to an uploaded HTML file and retry with content_url set.
async function createPageSafe(pageData) {
  try {
    return await base44.entities.KbPage.create(pageData);
  } catch (e) {
    if (e.message?.includes("exceeds the maximum allowed size") && pageData.content) {
      try {
        const file = new File([pageData.content], `page-${pageData.slug || "untitled"}.html`, { type: "text/html" });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return await base44.entities.KbPage.create({ ...pageData, content: "", content_url: file_url });
      } catch (uploadErr) {
        return await base44.entities.KbPage.create({ ...pageData, content: pageData.content.slice(0, 50000) + "\n<!-- Content truncated due to size limit -->" });
      }
    }
    throw e;
  }
}

// Try to update a page; if content exceeds the entity field limit, offload
// it to an uploaded HTML file and retry with content_url set.
async function updatePageSafe(pageId, pageData) {
  try {
    return await base44.entities.KbPage.update(pageId, pageData);
  } catch (e) {
    if (e.message?.includes("exceeds the maximum allowed size") && pageData.content) {
      try {
        const file = new File([pageData.content], `page-${pageData.slug || "untitled"}.html`, { type: "text/html" });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return await base44.entities.KbPage.update(pageId, { ...pageData, content: "", content_url: file_url });
      } catch (uploadErr) {
        return await base44.entities.KbPage.update(pageId, { ...pageData, content: pageData.content.slice(0, 50000) + "\n<!-- Content truncated due to size limit -->" });
      }
    }
    throw e;
  }
}

// Run async operations with limited concurrency for faster throughput.
async function mapWithConcurrency(items, concurrency, fn) {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

// --- Main migration runner ---

/**
 * Run a full BookStack → local KB migration (idempotent — safe to re-run).
 * @param {object} config - { baseUrl, tokenId, tokenSecret, user, onProgress, corsProxy }
 * @returns {object} migration result summary
 */
export async function runBookStackMigration(config) {
  const { baseUrl, tokenId, tokenSecret, user, onProgress, corsProxy = "" } = config;
  const client = createBookStackClient(baseUrl, tokenId, tokenSecret, corsProxy);
  const batchId = `mig_${Date.now()}`;
  const authHeader = `Token ${tokenId}:${tokenSecret}`;

  // Create migration log record
  const log = await base44.entities.KbMigrationLog.create({
    batch_id: batchId,
    source_url: baseUrl,
    status: "running",
    started_at: new Date().toISOString(),
    run_by_name: user?.full_name,
    run_by_email: user?.email,
    current_step: "Initializing",
  });

  const errors = [];
  const stats = {
    shelves: { total: 0, imported: 0, updated: 0, skipped: 0 },
    books: { total: 0, imported: 0, updated: 0, skipped: 0 },
    chapters: { total: 0, imported: 0, updated: 0, skipped: 0 },
    pages: { total: 0, imported: 0, updated: 0, skipped: 0 },
    assets: { total: 0, imported: 0, skipped: 0 },
  };

  const report = (step, current, total, detail) => {
    if (onProgress) onProgress({ step, current, total, detail });
  };

  const syncLog = async (currentStep) => {
    try {
      await base44.entities.KbMigrationLog.update(log.id, {
        total_shelves: stats.shelves.total,
        total_books: stats.books.total,
        total_chapters: stats.chapters.total,
        total_pages: stats.pages.total,
        total_assets: stats.assets.total,
        imported_shelves: stats.shelves.imported,
        imported_books: stats.books.imported,
        imported_chapters: stats.chapters.imported,
        imported_pages: stats.pages.imported,
        imported_assets: stats.assets.imported,
        failed_items: errors.length,
        current_step: currentStep,
      });
    } catch (e) { /* non-fatal */ }
  };

  // Pre-load existing records into maps for fast idempotent matching.
  const [existingShelves, existingBooks, existingChapters, existingPages, existingAssets] = await Promise.all([
    base44.entities.KbShelf.list("-created_date", 1000),
    base44.entities.KbBook.list("-created_date", 1000),
    base44.entities.KbChapter.list("-created_date", 1000),
    base44.entities.KbPage.list("-created_date", 1000),
    base44.entities.KbAsset.filter({ migrated_from: "bookstack" }, "-created_date", 1000),
  ]);

  const shelfBySlug = new Map(existingShelves.map((s) => [s.slug, s]));
  const bookBySlug = new Map(existingBooks.map((b) => [b.slug, b]));
  const chapterByKey = new Map(existingChapters.map((c) => [`${c.book_id}:${c.slug}`, c]));
  const pageByKey = new Map(existingPages.map((p) => [`${p.book_id}:${p.slug}`, p]));
  const assetByUrl = new Map(existingAssets.map((a) => [a.external_url, a]));

  try {
    // --- Phase 1: Shelves (idempotent) ---
    report("Fetching shelves from BookStack...", 0, 1, "");
    const shelves = await client.listShelves((done, total) => report("Fetching shelves...", done, total, ""));
    stats.shelves.total = shelves.length;
    const shelfIdMap = new Map();

    for (let i = 0; i < shelves.length; i++) {
      const s = shelves[i];
      try {
        const slug = s.slug || slugify(s.name);
        const existing = shelfBySlug.get(slug);
        if (existing) {
          await base44.entities.KbShelf.update(existing.id, {
            name: s.name,
            description: s.description || "",
            tags: mapTags(s.tags),
            order: i,
          });
          shelfIdMap.set(s.id, existing.id);
          stats.shelves.updated++;
        } else {
          const created = await base44.entities.KbShelf.create({
            name: s.name,
            slug,
            description: s.description || "",
            tags: mapTags(s.tags),
            book_ids: [],
            order: i,
            created_by_name: user?.full_name,
            created_by_email: user?.email,
          });
          shelfBySlug.set(slug, created);
          shelfIdMap.set(s.id, created.id);
          stats.shelves.imported++;
        }
      } catch (e) {
        errors.push({ entity_type: "shelf", source_id: String(s.id), source_name: s.name, error: e.message });
      }
      report("Importing shelves...", i + 1, shelves.length, s.name);
    }
    await syncLog("Shelves imported, fetching books...");

    // --- Phase 2: Books (idempotent) ---
    report("Fetching books from BookStack...", 0, 1, "");
    const books = await client.listBooks((done, total) => report("Fetching books...", done, total, ""));
    stats.books.total = books.length;
    const bookIdMap = new Map();
    const bookShelfMap = new Map();

    for (const s of shelves) {
      try {
        const detail = await client.getShelf(s.id);
        const localShelfId = shelfIdMap.get(s.id);
        if (detail.books && Array.isArray(detail.books)) {
          for (const b of detail.books) {
            if (!bookShelfMap.has(b.id)) bookShelfMap.set(b.id, []);
            bookShelfMap.get(b.id).push(localShelfId);
          }
        }
      } catch (e) { /* non-fatal */ }
    }

    for (let i = 0; i < books.length; i++) {
      const b = books[i];
      try {
        const slug = b.slug || slugify(b.name);
        const shelfIds = bookShelfMap.get(b.id) || [];
        const existing = bookBySlug.get(slug);
        if (existing) {
          await base44.entities.KbBook.update(existing.id, {
            title: b.name,
            description: b.description || "",
            tags: mapTags(b.tags),
            shelf_ids: shelfIds,
            order: i,
          });
          bookIdMap.set(b.id, existing.id);
          stats.books.updated++;
        } else {
          const created = await base44.entities.KbBook.create({
            title: b.name,
            slug,
            description: b.description || "",
            tags: mapTags(b.tags),
            shelf_ids: shelfIds,
            order: i,
            created_by_name: user?.full_name,
            created_by_email: user?.email,
          });
          bookBySlug.set(slug, created);
          bookIdMap.set(b.id, created.id);
          stats.books.imported++;
        }
      } catch (e) {
        errors.push({ entity_type: "book", source_id: String(b.id), source_name: b.name, error: e.message });
      }
      report("Importing books...", i + 1, books.length, b.name);
    }
    await syncLog("Books imported, fetching chapters...");

    // --- Phase 3: Chapters (idempotent) ---
    report("Fetching chapters from BookStack...", 0, 1, "");
    const chapters = await client.listChapters((done, total) => report("Fetching chapters...", done, total, ""));
    stats.chapters.total = chapters.length;
    const chapterIdMap = new Map();

    for (let i = 0; i < chapters.length; i++) {
      const c = chapters[i];
      try {
        const localBookId = bookIdMap.get(c.book_id);
        if (!localBookId) {
          errors.push({ entity_type: "chapter", source_id: String(c.id), source_name: c.name, error: "Parent book not imported" });
          continue;
        }
        const slug = c.slug || slugify(c.name);
        const key = `${localBookId}:${slug}`;
        const existing = chapterByKey.get(key);
        if (existing) {
          await base44.entities.KbChapter.update(existing.id, {
            title: c.name,
            description: c.description || "",
            tags: mapTags(c.tags),
            order: c.priority || i,
          });
          chapterIdMap.set(c.id, existing.id);
          stats.chapters.updated++;
        } else {
          const created = await base44.entities.KbChapter.create({
            book_id: localBookId,
            title: c.name,
            slug,
            description: c.description || "",
            tags: mapTags(c.tags),
            order: c.priority || i,
            created_by_name: user?.full_name,
            created_by_email: user?.email,
          });
          chapterByKey.set(key, created);
          chapterIdMap.set(c.id, created.id);
          stats.chapters.imported++;
        }
      } catch (e) {
        errors.push({ entity_type: "chapter", source_id: String(c.id), source_name: c.name, error: e.message });
      }
      report("Importing chapters...", i + 1, chapters.length, c.name);
    }
    await syncLog("Chapters imported, fetching pages...");

    // --- Phase 4: Pages (idempotent + concurrent, with media re-hosting) ---
    report("Fetching pages from BookStack...", 0, 1, "");
    const pages = await client.listPages((done, total) => report("Fetching pages...", done, total, ""));
    stats.pages.total = pages.length;

    let pageCounter = 0;
    await mapWithConcurrency(pages, 3, async (p) => {
      const myIndex = ++pageCounter;
      report("Importing pages & re-hosting media...", myIndex, pages.length, p.name);
      try {
        // API client already retries transient proxy/network failures
        const detail = await client.getPage(p.id);
        const localBookId = bookIdMap.get(detail.book_id);
        if (!localBookId) {
          errors.push({ entity_type: "page", source_id: String(detail.id), source_name: detail.name, error: "Parent book not imported" });
          return;
        }
        const localChapterId = detail.chapter_id ? chapterIdMap.get(detail.chapter_id) : undefined;

        let htmlContent = detail.html || detail.content || "";
        const markdownContent = detail.markdown || "";
        const slug = detail.slug || slugify(detail.name);

        // --- Re-host base64 embedded images (reduces content size significantly) ---
        const base64Uris = extractBase64Images(htmlContent);
        if (base64Uris.length > 0) {
          stats.assets.total += base64Uris.length;
          for (const dataUri of base64Uris) {
            try {
              const dedupKey = hashDataUri(dataUri);
              const existingAsset = assetByUrl.get(dedupKey);
              if (existingAsset) {
                htmlContent = htmlContent.replace(dataUri, existingAsset.file_url);
                stats.assets.skipped++;
                stats.assets.imported++;
                continue;
              }
              const { file_url, blob } = await rehostBase64(dataUri);
              htmlContent = htmlContent.replace(dataUri, file_url);
              const created = await base44.entities.KbAsset.create({
                file_name: `embedded-asset`,
                file_url,
                file_type: detectFileType(file_url, blob.type),
                file_size: blob.size,
                category: "Migrated",
                external_url: dedupKey,
                migrated_from: "bookstack",
                uploaded_by_name: user?.full_name,
                uploaded_by_email: user?.email,
              });
              assetByUrl.set(dedupKey, created);
              stats.assets.imported++;
            } catch (assetErr) {
              errors.push({ entity_type: "asset", source_id: "base64", source_name: "embedded image", error: assetErr.message });
            }
          }
        }

        // --- Re-host external media URLs (idempotent: skip already-imported) ---
        const mediaUrls = extractMediaUrls(htmlContent, baseUrl);
        if (mediaUrls.length > 0) {
          stats.assets.total += mediaUrls.length;
          const urlMap = new Map();
          for (const imgUrl of mediaUrls) {
            try {
              const resolvedUrl = resolveUrl(imgUrl, baseUrl);
              const existingAsset = assetByUrl.get(resolvedUrl);
              if (existingAsset) {
                urlMap.set(imgUrl, existingAsset.file_url);
                stats.assets.skipped++;
                stats.assets.imported++;
                continue;
              }
              const { file_url, blob } = await downloadAndRehost(imgUrl, baseUrl, authHeader, client.proxiedUrl);
              urlMap.set(imgUrl, file_url);
              const fileType = detectFileType(imgUrl, blob.type);
              const created = await base44.entities.KbAsset.create({
                file_name: extractFileName(resolvedUrl),
                file_url,
                file_type: fileType,
                file_size: blob.size,
                category: "Migrated",
                external_url: resolvedUrl,
                migrated_from: "bookstack",
                uploaded_by_name: user?.full_name,
                uploaded_by_email: user?.email,
              });
              assetByUrl.set(resolvedUrl, created);
              stats.assets.imported++;
            } catch (assetErr) {
              errors.push({ entity_type: "asset", source_id: imgUrl, source_name: extractFileName(imgUrl), error: assetErr.message });
            }
          }
          htmlContent = rewriteMediaUrls(htmlContent, urlMap);
        }

        // --- Find existing page and update or create ---
        const key = `${localBookId}:${slug}`;
        const existingPage = pageByKey.get(key);
        if (existingPage) {
          const contentChanged = existingPage.content !== htmlContent || existingPage.title !== detail.name;
          if (contentChanged) {
            const newVersion = (existingPage.version || 1) + 1;
            const updated = await updatePageSafe(existingPage.id, {
              chapter_id: localChapterId,
              title: detail.name,
              content: htmlContent,
              markdown_content: markdownContent,
              status: detail.draft ? "draft" : "published",
              is_template: detail.template || false,
              priority: detail.priority || 0,
              tags: mapTags(detail.tags),
              order: detail.priority || myIndex - 1,
              version: newVersion,
            });
            await base44.entities.KbPageRevision.create({
              page_id: existingPage.id,
              title: detail.name,
              content: updated.content || "",
              markdown_content: markdownContent,
              version: newVersion,
              summary: updated.content_url ? "Updated from BookStack re-sync (content stored as file)" : "Updated from BookStack re-sync",
              revision_type: "edit",
              editor_name: user?.full_name,
              editor_email: user?.email,
            });
            existingPage.content = updated.content;
            existingPage.content_url = updated.content_url;
            existingPage.title = detail.name;
            existingPage.version = newVersion;
            stats.pages.updated++;
          } else {
            stats.pages.skipped++;
          }
        } else {
          const created = await createPageSafe({
            book_id: localBookId,
            chapter_id: localChapterId,
            title: detail.name,
            slug,
            content: htmlContent,
            markdown_content: markdownContent,
            status: detail.draft ? "draft" : "published",
            is_template: detail.template || false,
            priority: detail.priority || 0,
            tags: mapTags(detail.tags),
            order: detail.priority || myIndex - 1,
            author_name: user?.full_name,
            author_email: user?.email,
            version: 1,
            view_count: 0,
          });
          pageByKey.set(key, created);
          await base44.entities.KbPageRevision.create({
            page_id: created.id,
            title: detail.name,
            content: created.content || "",
            markdown_content: markdownContent,
            version: 1,
            summary: created.content_url ? "Migrated from BookStack (content stored as file)" : "Migrated from BookStack",
            revision_type: "create",
            editor_name: user?.full_name,
            editor_email: user?.email,
          });
          stats.pages.imported++;
        }
      } catch (e) {
        errors.push({ entity_type: "page", source_id: String(p.id), source_name: p.name, error: e.message });
      }
      if (myIndex % 3 === 0) await syncLog(`Importing pages... (${myIndex}/${pages.length})`);
    });
    await syncLog("Pages imported, finalizing...");

    // --- Update shelf book_ids ---
    for (const [bsShelfId, localShelfId] of shelfIdMap) {
      try {
        const bookIds = [];
        for (const [bsBookId, localBookId] of bookIdMap) {
          if ((bookShelfMap.get(bsBookId) || []).includes(localShelfId)) {
            bookIds.push(localBookId);
          }
        }
        await base44.entities.KbShelf.update(localShelfId, { book_ids: bookIds });
      } catch (e) { /* non-fatal */ }
    }

    // --- Finalize ---
    const status = errors.length === 0 ? "completed" : stats.pages.imported + stats.pages.updated > 0 ? "partial" : "failed";
    await base44.entities.KbMigrationLog.update(log.id, {
      status,
      total_shelves: stats.shelves.total,
      total_books: stats.books.total,
      total_chapters: stats.chapters.total,
      total_pages: stats.pages.total,
      total_assets: stats.assets.total,
      imported_shelves: stats.shelves.imported,
      imported_books: stats.books.imported,
      imported_chapters: stats.chapters.imported,
      imported_pages: stats.pages.imported,
      imported_assets: stats.assets.imported,
      failed_items: errors.length,
      errors: errors.slice(0, 100),
      current_step: "Completed",
      completed_at: new Date().toISOString(),
    });

    return { batchId, status, stats, errors: errors.slice(0, 50) };
  } catch (e) {
    await base44.entities.KbMigrationLog.update(log.id, {
      status: "failed",
      errors: [...errors, { entity_type: "system", source_id: "", source_name: "", error: e.message }].slice(0, 100),
      current_step: "Failed: " + e.message,
      completed_at: new Date().toISOString(),
      total_shelves: stats.shelves.total,
      total_books: stats.books.total,
      total_chapters: stats.chapters.total,
      total_pages: stats.pages.total,
      total_assets: stats.assets.total,
      imported_shelves: stats.shelves.imported,
      imported_books: stats.books.imported,
      imported_chapters: stats.chapters.imported,
      imported_pages: stats.pages.imported,
      imported_assets: stats.assets.imported,
      failed_items: errors.length + 1,
    });
    throw e;
  }
}