/**
 * File uploads.
 *
 * POST /api/uploads  {filename, content_base64}
 *   - Validates the extension against an allowlist.
 *   - Enforces a 10 MB decoded-size cap.
 *   - Saves to data/uploads/<uuid>_<sanitized-name>.
 *   - Returns {file_url: "/uploads/<uuid>_<sanitized-name>"}.
 *
 * GET /uploads/* is served statically from data/uploads (wired in server.js).
 */
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_DIR } from '../lib/db.js';

const router = Router();

export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf']);

export function ensureUploadsDir() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function sanitizeFilename(filename) {
  const base = path.basename(String(filename || '')).trim();
  const ext = base.includes('.') ? base.split('.').pop().toLowerCase() : '';
  if (!ALLOWED_EXT.has(ext)) return null;
  const stem = base.slice(0, base.length - ext.length - 1) || 'file';
  const clean = stem.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'file';
  return `${clean}.${ext}`;
}

router.post('/uploads', (req, res) => {
  const { filename, content_base64 } = req.body || {};
  if (!filename || !content_base64) {
    return res.status(400).json({ error: 'filename and content_base64 are required' });
  }
  const safe = sanitizeFilename(filename);
  if (!safe) {
    return res.status(400).json({
      error: `Unsupported file type. Allowed: ${[...ALLOWED_EXT].join(', ')}`,
    });
  }
  let buf;
  try {
    buf = Buffer.from(String(content_base64), 'base64');
  } catch {
    return res.status(400).json({ error: 'content_base64 is not valid base64' });
  }
  if (buf.length === 0) {
    return res.status(400).json({ error: 'Empty file' });
  }
  if (buf.length > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ error: 'File exceeds the 10 MB limit' });
  }
  ensureUploadsDir();
  const stored = `${crypto.randomUUID()}_${safe}`;
  const dest = path.join(UPLOADS_DIR, stored);
  // stored name is uuid + sanitized basename: no path traversal possible.
  fs.writeFileSync(dest, buf);
  res.status(201).json({ file_url: `/uploads/${stored}` });
});

export default router;
