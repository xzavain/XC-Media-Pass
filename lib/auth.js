/**
 * Bearer-token authentication middleware.
 *
 * Reads `Authorization: Bearer <token>`, validates it against the sessions
 * table (checking expiry), and attaches `req.user` ({id, email, role,
 * full_name}) or null. It never rejects by itself — public RLS rules allow
 * unauthenticated access where the schema says so; protected routes and RLS
 * checks turn a null user into 401/403 as appropriate.
 */
import { getDb } from './db.js';

export function authMiddleware(req, res, next) {
  req.user = null;
  req.sessionToken = null;
  const header = req.headers.authorization || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return next();
  const token = m[1].trim();
  try {
    const db = getDb();
    const row = db.prepare('SELECT "token","user_id","expires_at" FROM "sessions" WHERE "token" = ?').get(token);
    if (!row) return next();
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      db.prepare('DELETE FROM "sessions" WHERE "token" = ?').run(token);
      return next();
    }
    const user = db.prepare(
      'SELECT "id","email","role","full_name","disabled" FROM "users" WHERE "id" = ?'
    ).get(row.user_id);
    if (!user || user.disabled) return next();
    req.user = { id: user.id, email: user.email, role: user.role, full_name: user.full_name };
    req.sessionToken = token;
  } catch {
    // Auth failures are non-fatal: request continues unauthenticated.
  }
  return next();
}

/** Reject when there is no authenticated user. */
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

/** Reject unless the authenticated user is an admin. */
export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}
