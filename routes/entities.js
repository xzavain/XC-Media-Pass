/**
 * Generic entity CRUD, driven by the base44 entity schemas.
 *
 *   GET    /api/entities/:name?filter=&sort=&limit=&offset=
 *   GET    /api/entities/:name/:id
 *   POST   /api/entities/:name
 *   POST   /api/entities/:name/aggregate      {groupBy, sum} -> {rows}
 *   POST   /api/entities/:name/bulk           [objects] -> [created]
 *   PUT    /api/entities/:name/:id
 *   PUT    /api/entities/:name/bulk           [{id, ...}] -> [updated]
 *   DELETE /api/entities/:name/:id
 *   DELETE /api/entities/:name?filter=        -> {deleted: n}
 *
 * Every operation is gated by the entity's server-side RLS rules (see
 * lib/rls.js). Unknown entity names -> 404. Missing required fields on
 * create -> 400.
 *
 * NOTE: the `User` entity is NOT handled here — it is virtualized onto the
 * `users` table by routes/userEntity.js, mounted before this router.
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import {
  getDb,
  getSchemaByName,
  sanitizeColumn,
  encodeValue,
  decodeRecord,
  applyDefaults,
  entityTableName,
  qident,
} from '../lib/db.js';
import {
  canCreate,
  canRead,
  canUpdate,
  canDelete,
  ruleFor,
  matchFilter,
  sortRecords,
  compareValues,
} from '../lib/rls.js';

const router = Router();
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

function loadSchema(req, res) {
  const schema = getSchemaByName(req.params.name);
  if (!schema) {
    res.status(404).json({ error: `Unknown entity: ${req.params.name}` });
    return null;
  }
  return schema;
}

function tableFor(schema) {
  return qident(entityTableName(schema.name));
}

function fetchAll(schema) {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM ${tableFor(schema)}`).all();
  return rows.map((r) => decodeRecord(schema, r));
}

function deny(res, req) {
  // Unauthenticated -> 401, authenticated but not allowed -> 403.
  return res.status(req.user ? 403 : 401).json({ error: 'Not allowed' });
}

function parseLimitOffset(req) {
  let limit = Number.parseInt(req.query.limit, 10);
  let offset = Number.parseInt(req.query.offset, 10);
  if (!Number.isFinite(limit) || limit < 0) limit = DEFAULT_LIMIT;
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  return { limit: Math.min(limit, MAX_LIMIT), offset };
}

function parseFilterParam(req, res) {
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

// Throws {status, message} on failure; otherwise returns the created record.
function createOne(schema, body, user) {
  const data = applyDefaults(schema, { ...(body || {}) });
  if (user) data.created_by = user.id; // auto-fill (null for public creates)

  if (!canCreate(schema, user, data)) {
    throw { status: user ? 403 : 401, message: 'Not allowed' };
  }
  const missing = (schema.required || []).filter(
    (f) => data[f] === undefined || data[f] === null || data[f] === ''
  );
  if (missing.length) {
    throw { status: 400, message: `Missing required fields: ${missing.join(', ')}` };
  }

  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const cols = [qident('id'), qident('created_date'), qident('updated_date'), qident('created_by')];
  const vals = [id, now, now, data.created_by ?? null];
  for (const [propName, prop] of Object.entries(schema.properties || {})) {
    if (data[propName] === undefined) continue; // leave column NULL
    cols.push(qident(sanitizeColumn(propName)));
    vals.push(encodeValue(prop, data[propName]));
  }
  db.prepare(
    `INSERT INTO ${tableFor(schema)} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
  ).run(...vals);
  return decodeRecord(
    schema,
    db.prepare(`SELECT * FROM ${tableFor(schema)} WHERE ${qident('id')} = ?`).get(id)
  );
}

// Throws {status, message} on failure; otherwise returns the updated record.
function updateOne(schema, id, body, user) {
  const db = getDb();
  const table = tableFor(schema);
  const row = db.prepare(`SELECT * FROM ${table} WHERE ${qident('id')} = ?`).get(id);
  if (!row) throw { status: 404, message: 'Not found' };
  if (!canUpdate(schema, user, decodeRecord(schema, row))) {
    throw { status: user ? 403 : 401, message: 'Not allowed' };
  }
  const sets = [];
  const vals = [];
  for (const [propName, prop] of Object.entries(schema.properties || {})) {
    if (!(propName in (body || {}))) continue;
    if (['id', 'created_date', 'created_by'].includes(propName)) continue;
    sets.push(`${qident(sanitizeColumn(propName))} = ?`);
    vals.push(encodeValue(prop, body[propName]));
  }
  if (!sets.length) throw { status: 400, message: 'No updatable fields provided' };
  sets.push(`${qident('updated_date')} = ?`);
  vals.push(new Date().toISOString());
  vals.push(id);
  db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE ${qident('id')} = ?`).run(...vals);
  return decodeRecord(schema, db.prepare(`SELECT * FROM ${table} WHERE ${qident('id')} = ?`).get(id));
}

// ---------------------------------------------------------------------------
// Multi-record endpoints (registered before the :id routes so that e.g.
// PUT /:name/bulk is not captured by PUT /:name/:id)
// ---------------------------------------------------------------------------

// POST /api/entities/:name/aggregate {groupBy, sum} -> {rows}
router.post('/:name/aggregate', (req, res) => {
  const schema = loadSchema(req, res);
  if (!schema) return;
  if (!req.user && ruleFor(schema, 'read') !== null) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const { groupBy, sum } = req.body || {};
  if (!groupBy || !sum) {
    return res.status(400).json({ error: 'body must include {groupBy, sum}' });
  }
  const records = fetchAll(schema).filter((r) => canRead(schema, req.user, r));
  const groups = new Map();
  for (const r of records) {
    const key = r[groupBy] === undefined ? null : r[groupBy];
    const k = JSON.stringify(key);
    if (!groups.has(k)) groups.set(k, { key, total: 0 });
    const v = Number(r[sum]);
    if (Number.isFinite(v)) groups.get(k).total += v;
  }
  const rows = [...groups.values()]
    .sort((a, b) => compareValues(a.key, b.key))
    .map(({ key, total }) => ({ [groupBy]: key, [`sum_${sum}`]: total }));
  res.json({ rows });
});

// POST /api/entities/:name/bulk — create many (all-or-nothing)
router.post('/:name/bulk', (req, res) => {
  const schema = loadSchema(req, res);
  if (!schema) return;
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'body must be an array of objects' });
  }
  const db = getDb();
  try {
    const created = db.transaction(() => items.map((item, i) => {
      try {
        return createOne(schema, item, req.user);
      } catch (err) {
        throw { status: err.status || 500, message: `item ${i}: ${err.message || 'failed'}` };
      }
    }))();
    res.status(201).json(created);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Bulk create failed' });
  }
});

// PUT /api/entities/:name/bulk — update many (all-or-nothing)
router.put('/:name/bulk', (req, res) => {
  const schema = loadSchema(req, res);
  if (!schema) return;
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'body must be an array of objects with id' });
  }
  const db = getDb();
  try {
    const updated = db.transaction(() => items.map((item, i) => {
      if (!item || !item.id) throw { status: 400, message: `item ${i}: missing id` };
      try {
        return updateOne(schema, item.id, item, req.user);
      } catch (err) {
        throw { status: err.status || 500, message: `item ${i} (${item.id}): ${err.message || 'failed'}` };
      }
    }))();
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Bulk update failed' });
  }
});

// DELETE /api/entities/:name?filter= — delete all matching filter+RLS
router.delete('/:name', (req, res) => {
  const schema = loadSchema(req, res);
  if (!schema) return;
  const filter = parseFilterParam(req, res);
  if (filter === null) return;
  const db = getDb();
  const table = tableFor(schema);
  let deleted = 0;
  const tx = db.transaction(() => {
    for (const record of fetchAll(schema)) {
      if (!canRead(schema, req.user, record)) continue;
      if (!matchFilter(record, filter)) continue;
      if (!canDelete(schema, req.user, record)) continue;
      db.prepare(`DELETE FROM ${table} WHERE ${qident('id')} = ?`).run(record.id);
      deleted++;
    }
  });
  tx();
  res.json({ deleted });
});

// ---------------------------------------------------------------------------
// Single-record endpoints
// ---------------------------------------------------------------------------

// GET /api/entities/:name — list with filter/sort/limit/offset
router.get('/:name', (req, res) => {
  const schema = loadSchema(req, res);
  if (!schema) return;
  if (!req.user && ruleFor(schema, 'read') !== null) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const filter = parseFilterParam(req, res);
  if (filter === null) return;

  let records = fetchAll(schema).filter((r) => canRead(schema, req.user, r));
  records = records.filter((r) => matchFilter(r, filter));
  records = sortRecords(records, req.query.sort);

  const { limit, offset } = parseLimitOffset(req);
  res.json(records.slice(offset, offset + limit));
});

// GET /api/entities/:name/:id
router.get('/:name/:id', (req, res) => {
  const schema = loadSchema(req, res);
  if (!schema) return;
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM ${tableFor(schema)} WHERE ${qident('id')} = ?`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const record = decodeRecord(schema, row);
  if (!canRead(schema, req.user, record)) return deny(res, req);
  res.json(record);
});

// POST /api/entities/:name
router.post('/:name', (req, res) => {
  const schema = loadSchema(req, res);
  if (!schema) return;
  try {
    res.status(201).json(createOne(schema, req.body, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Create failed' });
  }
});

// PUT /api/entities/:name/:id
router.put('/:name/:id', (req, res) => {
  const schema = loadSchema(req, res);
  if (!schema) return;
  try {
    res.json(updateOne(schema, req.params.id, req.body, req.user));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Update failed' });
  }
});

// DELETE /api/entities/:name/:id
router.delete('/:name/:id', (req, res) => {
  const schema = loadSchema(req, res);
  if (!schema) return;
  const db = getDb();
  const table = tableFor(schema);
  const row = db.prepare(`SELECT * FROM ${table} WHERE ${qident('id')} = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!canDelete(schema, req.user, decodeRecord(schema, row))) return deny(res, req);
  db.prepare(`DELETE FROM ${table} WHERE ${qident('id')} = ?`).run(req.params.id);
  res.json({ ok: true, id: req.params.id });
});

export default router;
