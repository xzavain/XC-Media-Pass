/**
 * Database layer for the XC Media Pass self-hosted backend.
 *
 * - Opens (and creates) a SQLite database at <DATA_DIR>/xcmediapass.db
 * - Loads entity schemas from base44/entities/*.jsonc and creates one table
 *   per entity on boot (id TEXT PRIMARY KEY + created_date/updated_date/
 *   created_by + one column per schema property)
 * - Provides value encoding/decoding between JSON records and SQLite columns
 * - scrypt password hashing for the users table
 * - First-boot admin creation from ADMIN_EMAIL / ADMIN_PASSWORD
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

// Project root = parent of this lib/ directory.
export const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');
export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'xcmediapass.db');
const ENTITIES_DIR = path.join(ROOT_DIR, 'base44', 'entities');

// ---------------------------------------------------------------------------
// Minimal JSONC parser (strips // and /* */ comments outside string literals)
// ---------------------------------------------------------------------------
export function stripJsonComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let inString = false;
  let escaped = false;
  while (i < n) {
    const c = src[i];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      i++;
      continue;
    }
    if (c === '"') { inString = true; out += c; i++; continue; }
    if (c === '/' && i + 1 < n && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && i + 1 < n && src[i + 1] === '*') {
      i += 2;
      while (i + 1 < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export function loadEntitySchemas() {
  const schemas = [];
  for (const file of fs.readdirSync(ENTITIES_DIR).sort()) {
    if (!file.endsWith('.jsonc')) continue;
    const raw = fs.readFileSync(path.join(ENTITIES_DIR, file), 'utf8');
    let schema;
    try {
      schema = JSON.parse(stripJsonComments(raw));
    } catch (err) {
      throw new Error(`Failed to parse entity schema ${file}: ${err.message}`);
    }
    if (!schema.name || !schema.properties) {
      throw new Error(`Invalid entity schema ${file}: missing name/properties`);
    }
    schemas.push(schema);
  }
  return schemas;
}

// ---------------------------------------------------------------------------
// Column naming / type mapping
// ---------------------------------------------------------------------------
export function sanitizeColumn(name) {
  const c = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return c || 'field';
}

export function columnType(prop) {
  switch (prop.type) {
    case 'number': return 'REAL';
    case 'integer': return 'INTEGER';
    case 'boolean': return 'INTEGER';
    default: return 'TEXT'; // string, date, enum, array, object, unknown
  }
}

// Quote an identifier for SQLite (handles reserved words like "key", "order").
export function qident(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

export function entityTableName(entityName) {
  return entityName.toLowerCase();
}

// ---------------------------------------------------------------------------
// Value encoding (record -> sqlite) and decoding (sqlite row -> record)
// ---------------------------------------------------------------------------
export function encodeValue(prop, value) {
  if (value === undefined || value === null) return null;
  switch (prop.type) {
    case 'boolean': return value ? 1 : 0;
    case 'array':
    case 'object':
      try { return JSON.stringify(value); } catch { return null; }
    case 'number':
    case 'integer': {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    default:
      return typeof value === 'string' ? value : String(value);
  }
}

export function decodeValue(prop, raw) {
  if (raw === undefined || raw === null) return null;
  switch (prop.type) {
    case 'boolean': return raw === 1 || raw === 1.0 ? true : raw === 0 || raw === 0.0 ? false : Boolean(raw);
    case 'array':
      if (raw === null || raw === '') return null;
      try { const v = JSON.parse(raw); return Array.isArray(v) ? v : v; }
      catch { return null; }
    case 'object':
      if (raw === null || raw === '') return null;
      try { return JSON.parse(raw); } catch { return null; }
    default: return raw;
  }
}

export function applyDefaults(schema, data) {
  const out = { ...data };
  for (const [propName, prop] of Object.entries(schema.properties || {})) {
    if ((out[propName] === undefined || out[propName] === null) && prop && prop.default !== undefined) {
      out[propName] = Array.isArray(prop.default) ? [...prop.default]
        : (prop.default && typeof prop.default === 'object' ? { ...prop.default } : prop.default);
    }
  }
  return out;
}

export function decodeRecord(schema, row) {
  if (!row) return null;
  const rec = {
    id: row.id,
    created_date: row.created_date,
    updated_date: row.updated_date,
    created_by: row.created_by,
  };
  for (const [propName, prop] of Object.entries(schema.properties || {})) {
    rec[propName] = decodeValue(prop, row[sanitizeColumn(propName)]);
  }
  return rec;
}

// ---------------------------------------------------------------------------
// Password hashing (node:crypto scrypt, format: scrypt$salt$hash)
// ---------------------------------------------------------------------------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const parts = String(stored).split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const [, salt, expected] = parts;
    const actual = crypto.scryptSync(String(password), salt, 64).toString('hex');
    const a = Buffer.from(actual, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex');
}

// The `User` entity name is virtualized: /api/entities/User is served from
// the `users` table (never exposes password_hash) instead of a generated
// `user` table. See routes/userEntity.js.
export const USER_ENTITY_VIRTUALIZED = 'User';

/** Strip sensitive fields from a users-table row before sending to clients. */
export function publicUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    full_name: row.full_name,
    created_date: row.created_date,
    disabled: Boolean(row.disabled),
  };
}

// ---------------------------------------------------------------------------
// Boot: open DB, create tables, first-boot admin
// ---------------------------------------------------------------------------
let db = null;
let schemas = null;

export function initDb() {
  if (db) return { db, schemas };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  schemas = loadEntitySchemas();
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const createTable = (table, columns) => {
    db.exec(`CREATE TABLE IF NOT EXISTS ${qident(table)} (${columns})`);
  };

  // Entity tables.
  // NOTE: the `User` entity is virtualized onto the `users` table (see
  // routes/userEntity.js) and does not get its own table.
  for (const schema of schemas) {
    if (schema.name === USER_ENTITY_VIRTUALIZED) continue;    const cols = [
      `${qident('id')} TEXT PRIMARY KEY`,
      `${qident('created_date')} TEXT`,
      `${qident('updated_date')} TEXT`,
      `${qident('created_by')} TEXT`,
    ];
    for (const [propName, prop] of Object.entries(schema.properties || {})) {
      cols.push(`${qident(sanitizeColumn(propName))} ${columnType(prop)}`);
    }
    createTable(entityTableName(schema.name), cols.join(', '));
  }

  // Users table (app logins: admin / staff / customer).
  createTable('users', [
    `${qident('id')} TEXT PRIMARY KEY`,
    `${qident('email')} TEXT UNIQUE NOT NULL`,
    `${qident('password_hash')} TEXT NOT NULL`,
    `${qident('role')} TEXT NOT NULL DEFAULT 'customer' CHECK (${qident('role')} IN ('admin','staff','customer'))`,
    `${qident('full_name')} TEXT`,
    `${qident('created_date')} TEXT NOT NULL`,
    `${qident('disabled')} INTEGER NOT NULL DEFAULT 0`,
  ].join(', '));

  // Sessions table (bearer tokens).
  createTable('sessions', [
    `${qident('token')} TEXT PRIMARY KEY`,
    `${qident('user_id')} TEXT NOT NULL`,
    `${qident('created_at')} TEXT NOT NULL`,
    `${qident('expires_at')} TEXT NOT NULL`,
  ].join(', '));

  ensureFirstAdmin();
  return { db, schemas };
}

function ensureFirstAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM "users"').get().c;
  if (count > 0) return;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('[db] users table is empty and ADMIN_EMAIL/ADMIN_PASSWORD are not set — no admin created. Set them in .env and restart to create the first admin.');
    return;
  }
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO "users" ("id","email","password_hash","role","full_name","created_date","disabled") VALUES (?,?,?,?,?,?,0)'
  ).run(crypto.randomUUID(), email.toLowerCase().trim(), hashPassword(password), 'admin', 'Administrator', now);
  console.log(`[db] first admin created for ${email}.`);
}

export function getDb() {
  if (!db) initDb();
  return db;
}

export function getSchemas() {
  if (!schemas) initDb();
  return schemas;
}

export function getSchemaByName(name) {
  return getSchemas().find((s) => s.name === name) || null;
}

export function closeDb() {
  if (db) { db.close(); db = null; schemas = null; }
}
