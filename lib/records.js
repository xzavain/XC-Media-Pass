/**
 * Server-side record helpers for system work (webhooks, sync, invite
 * activation) that must write entity records outside the HTTP RLS layer.
 *
 * Uses the same schemas, defaults and value encoding as the generic entity
 * API (routes/entities.js), so records written here are indistinguishable
 * from records written through the API.
 */

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
} from './db.js';

function tableFor(schema) {
  return qident(entityTableName(schema.name));
}

export function getRecordById(entityName, id) {
  const schema = getSchemaByName(entityName);
  if (!schema || !id) return null;
  const row = getDb()
    .prepare(`SELECT * FROM ${tableFor(schema)} WHERE ${qident('id')} = ?`)
    .get(id);
  return row ? decodeRecord(schema, row) : null;
}

export function findRecords(entityName, predicate) {
  const schema = getSchemaByName(entityName);
  if (!schema) return [];
  const rows = getDb().prepare(`SELECT * FROM ${tableFor(schema)}`).all();
  const records = rows.map((r) => decodeRecord(schema, r));
  return predicate ? records.filter(predicate) : records;
}

export function findRecord(entityName, predicate) {
  return findRecords(entityName, predicate)[0] || null;
}

/** Insert a record (defaults applied). Returns the decoded record. */
export function insertRecord(entityName, data, createdBy = null) {
  const schema = getSchemaByName(entityName);
  if (!schema) throw new Error(`Unknown entity: ${entityName}`);
  const db = getDb();
  const withDefaults = applyDefaults(schema, { ...(data || {}) });
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const cols = [qident('id'), qident('created_date'), qident('updated_date'), qident('created_by')];
  const vals = [id, now, now, createdBy];
  for (const [propName, prop] of Object.entries(schema.properties || {})) {
    if (withDefaults[propName] === undefined) continue;
    cols.push(qident(sanitizeColumn(propName)));
    vals.push(encodeValue(prop, withDefaults[propName]));
  }
  db.prepare(
    `INSERT INTO ${tableFor(schema)} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
  ).run(...vals);
  return getRecordById(entityName, id);
}

/** Patch a record by id. Returns the decoded record (or null if missing). */
export function updateRecord(entityName, id, patch) {
  const schema = getSchemaByName(entityName);
  if (!schema) throw new Error(`Unknown entity: ${entityName}`);
  const db = getDb();
  const existing = getRecordById(entityName, id);
  if (!existing) return null;
  const sets = [];
  const vals = [];
  for (const [propName, prop] of Object.entries(schema.properties || {})) {
    if (!(propName in (patch || {}))) continue;
    if (['id', 'created_date', 'created_by'].includes(propName)) continue;
    sets.push(`${qident(sanitizeColumn(propName))} = ?`);
    vals.push(encodeValue(prop, patch[propName]));
  }
  if (!sets.length) return existing;
  sets.push(`${qident('updated_date')} = ?`);
  vals.push(new Date().toISOString());
  vals.push(id);
  db.prepare(`UPDATE ${tableFor(schema)} SET ${sets.join(', ')} WHERE ${qident('id')} = ?`).run(...vals);
  return getRecordById(entityName, id);
}
