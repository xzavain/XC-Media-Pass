/**
 * The built-in `User` entity, virtualized onto the `users` table.
 *
 * Mounted at /api/entities/User (before the generic entity router).
 *
 * Semantics:
 *   - List: admin-only.
 *   - Get / update: admin, or the user themself (own record only).
 *   - Create (single or bulk): always 403 — use POST /api/users/invite.
 *   - Delete: admin-only (an admin cannot delete their own account here).
 *   - Role guard: a non-admin updating a record may not change `role`
 *     (or `disabled`); those fields are silently stripped instead of failing,
 *     because the frontend's login flow self-patches role and must not break.
 *     Admins may change roles.
 *   - password_hash is never returned in any response.
 *   - Aggregate: sums over the records the requester may read.
 */
import { Router } from 'express';
import { getDb, publicUserRow } from '../lib/db.js';
import { compareValues, matchFilter } from '../lib/rls.js';

const router = Router();
const VALID_ROLES = ['admin', 'staff', 'customer'];

function deny(res, req) {
  return res.status(req.user ? 403 : 401).json({ error: 'Not allowed' });
}

function canList(user) {
  return !!user && user.role === 'admin';
}

function canAccess(user, id) {
  return !!user && (user.role === 'admin' || user.id === id);
}

function getUserRow(id) {
  return getDb().prepare('SELECT * FROM "users" WHERE "id" = ?').get(id);
}

function parseFilter(req, res) {
  if (!req.query.filter) return {};
  try {
    const f = JSON.parse(req.query.filter);
    if (!f || typeof f !== 'object' || Array.isArray(f)) throw new Error('bad');
    return f;
  } catch {
    res.status(400).json({ error: 'filter must be a valid JSON object' });
    return null;
  }
}

// GET /api/entities/User — admin-only list
router.get('/', (req, res) => {
  if (!canList(req.user)) return deny(res, req);
  const rows = getDb().prepare('SELECT * FROM "users" ORDER BY "created_date" DESC').all();
  res.json(rows.map(publicUserRow));
});

// POST /api/entities/User/aggregate — {groupBy, sum} over readable records
router.post('/aggregate', (req, res) => {
  const { groupBy, sum } = req.body || {};
  if (!groupBy || !sum) {
    return res.status(400).json({ error: 'body must include {groupBy, sum}' });
  }
  if (!req.user) return deny(res, req); // user list is never public
  let rows = getDb().prepare('SELECT * FROM "users"').all().map(publicUserRow);
  if (!canList(req.user)) {
    rows = req.user ? rows.filter((r) => r.id === req.user.id) : [];
  }
  const groups = new Map();
  for (const r of rows) {
    const key = r[groupBy] === undefined ? null : r[groupBy];
    const k = JSON.stringify(key);
    if (!groups.has(k)) groups.set(k, { key, total: 0 });
    const v = Number(r[sum]);
    if (Number.isFinite(v)) groups.get(k).total += v;
  }
  const out = [...groups.values()]
    .sort((a, b) => compareValues(a.key, b.key))
    .map(({ key, total }) => ({ [groupBy]: key, [`sum_${sum}`]: total }));
  res.json({ rows: out });
});

// POST /api/entities/User/bulk — creation is not allowed via entities
router.post('/bulk', (req, res) => {
  res.status(403).json({ error: 'Use POST /api/users/invite to create users' });
});

// PUT /api/entities/User/bulk — per-record update rules
router.put('/bulk', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'body must be an array of objects with id' });
  }
  try {
    const updated = items.map((item) => applyUpdate(item?.id, item || {}, req));
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Bulk update failed' });
  }
});

// DELETE /api/entities/User?filter= — admin-only bulk delete
router.delete('/', (req, res) => {
  if (!canList(req.user)) return deny(res, req);
  const filter = parseFilter(req, res);
  if (filter === null) return;
  const db = getDb();
  const rows = db.prepare('SELECT * FROM "users"').all().map(publicUserRow);
  let deleted = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
      if (!matchFilter(r, filter)) continue;
      if (r.id === req.user.id) continue; // cannot delete your own account here
      db.prepare('DELETE FROM "sessions" WHERE "user_id" = ?').run(r.id);
      db.prepare('DELETE FROM "users" WHERE "id" = ?').run(r.id);
      deleted++;
    }
  });
  tx();
  res.json({ deleted });
});

// POST /api/entities/User — creation is not allowed via entities
router.post('/', (req, res) => {
  res.status(403).json({ error: 'Use POST /api/users/invite to create users' });
});

// GET /api/entities/User/:id — admin or self
router.get('/:id', (req, res) => {
  if (!canAccess(req.user, req.params.id)) return deny(res, req);
  const row = getUserRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(publicUserRow(row));
});

// PUT /api/entities/User/:id — admin or self (role guard for non-admins)
router.put('/:id', (req, res) => {
  try {
    res.json(applyUpdate(req.params.id, req.body || {}, req));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Update failed' });
  }
});

// DELETE /api/entities/User/:id — admin-only
router.delete('/:id', (req, res) => {
  if (!canList(req.user)) return deny(res, req);
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const db = getDb();
  const row = getUserRow(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM "sessions" WHERE "user_id" = ?').run(req.params.id);
  db.prepare('DELETE FROM "users" WHERE "id" = ?').run(req.params.id);
  res.json({ ok: true, id: req.params.id });
});

function applyUpdate(id, body, req) {
  if (!id) {
    const err = new Error('Each item must include an id');
    err.status = 400;
    throw err;
  }
  if (!canAccess(req.user, id)) {
    const err = new Error('Not allowed');
    err.status = req.user ? 403 : 401;
    throw err;
  }
  const db = getDb();
  const row = getUserRow(id);
  if (!row) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  const isAdmin = req.user.role === 'admin';
  const sets = [];
  const vals = [];

  // Non-admins silently lose privileged fields (frontend login flow
  // self-patches role and must not break); admins may set them.
  if (isAdmin && body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      const err = new Error(`role must be one of: ${VALID_ROLES.join(', ')}`);
      err.status = 400;
      throw err;
    }
    sets.push('"role" = ?');
    vals.push(body.role);
  }
  if (isAdmin && body.disabled !== undefined) {
    sets.push('"disabled" = ?');
    vals.push(body.disabled ? 1 : 0);
  }
  if (body.full_name !== undefined) {
    sets.push('"full_name" = ?');
    vals.push(body.full_name === null ? null : String(body.full_name));
  }
  if (body.email !== undefined) {
    const email = String(body.email).toLowerCase().trim();
    if (!email.includes('@')) {
      const err = new Error('Invalid email');
      err.status = 400;
      throw err;
    }
    const clash = db.prepare('SELECT "id" FROM "users" WHERE lower("email") = lower(?) AND "id" != ?').get(email, id);
    if (clash) {
      const err = new Error('A user with that email already exists');
      err.status = 409;
      throw err;
    }
    sets.push('"email" = ?');
    vals.push(email);
  }
  // password_hash / id / created_date can never be set through this endpoint.

  if (sets.length) {
    vals.push(id);
    db.prepare(`UPDATE "users" SET ${sets.join(', ')} WHERE "id" = ?`).run(...vals);
  }
  return publicUserRow(getUserRow(id));
}

export default router;
