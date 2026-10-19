/**
 * XC Media Pass — self-hosted backend.
 *
 * Node 20 + Express + SQLite (better-sqlite3). Serves the generic entity API
 * with server-side RLS, the auth endpoints, file uploads, and the Vite SPA
 * build from dist/.
 */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, ROOT_DIR } from './lib/db.js';
import { authMiddleware } from './lib/auth.js';
import authRoutes, { inviteRouter } from './routes/auth.js';
import userEntityRoutes from './routes/userEntity.js';
import entityRoutes from './routes/entities.js';
import uploadsRoutes, { UPLOADS_DIR, ensureUploadsDir } from './routes/uploads.js';

const DIST_DIR = path.join(ROOT_DIR, 'dist');

export function createApp() {
  initDb(); // create tables, first-boot admin
  ensureUploadsDir();
  const app = express();
  app.disable('x-powered-by');
  // 15 MB JSON limit: base64 uploads inflate ~33%, while the decoded file
  // itself is capped at 10 MB in the upload handler.
  app.use(express.json({ limit: '15mb' }));
  app.use(authMiddleware);

  app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  // Public app settings (used by the frontend bootstrap).
  app.get('/api/settings/public', (req, res) => {
    res.json({
      configured: true,
      brand: { name: 'Xzavain Cloud', product: 'XC Media Pass' },
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', inviteRouter); // POST /api/users/invite
  app.use('/api', uploadsRoutes); // POST /api/uploads
  // The built-in User entity (virtualized onto the users table) must be
  // mounted before the generic entity router.
  app.use('/api/entities/User', userEntityRoutes);
  app.use('/api/entities', entityRoutes);

  // Honest stub for the legacy frontend bootstrap call. The frontend shim
  // replaces this call, but a direct hit must never crash.
  app.get('/api/apps/public/*', (req, res) => {
    res.json({ configured: false, message: 'self-hosted: configure in .env' });
  });

  // Unknown API routes -> JSON 404 (before the static/SPA fallback).
  app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route' }));

  // Uploaded files.
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Serve the Vite build if present, with SPA fallback.
  if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    app.use(express.static(DIST_DIR, { index: false }));
    app.get(/^(?!\/api)(?!\/uploads).*/, (req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
    console.log('[server] serving frontend from dist/');
  } else {
    app.get(/^(?!\/api)(?!\/uploads).*/, (req, res) => {
      res.type('text/plain').send(
        'XC Media Pass backend is running, but no frontend build was found.\n' +
        'Run `npm run build` to generate dist/, or check the Docker build logs.'
      );
    });
    console.log('[server] dist/ not found — serving API only');
  }

  // JSON error handler for malformed bodies etc.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[server] error:', err.message);
    const status = err.status || err.statusCode || 500;
    if (!res.headersSent) {
      res.status(status).json({ error: status === 413 ? 'Payload too large' : (err.message || 'Internal server error') });
    }
  });

  return app;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[server] XC Media Pass backend listening on port ${PORT}`);
  });
}
