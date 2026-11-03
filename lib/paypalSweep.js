/**
 * PayPal daily balance sweep.
 *
 * Once a day, sends the source PayPal account's available balance (minus a
 * configurable reserve) to a destination PayPal account through the PayPal
 * Payouts API. Every attempt — sent, skipped, or failed — is persisted to
 * paypal_sweep_runs so the admin page can show the full history.
 *
 * Credentials either come from an existing PayPal PaymentGatewayAccount
 * (the app's gateway account storage, admin-only) or from client ID/secret
 * fields stored on the sweep config row itself. Secrets are never returned
 * to the client; the API layer masks them.
 *
 * The PayPal API base URL follows the account mode (live/sandbox), matching
 * the gateway conventions used elsewhere in the app. PAYPAL_API_BASE_URL
 * overrides the base for local testing against a stub.
 */

import crypto from 'node:crypto';
import { getDb } from './db.js';

const TIME_ZONE = 'America/Chicago';
const LIVE_BASE = 'https://api-m.paypal.com';
const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';

let tablesReady = false;
function ensureTables() {
  if (tablesReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS "paypal_sweep_config" (
      "id" INTEGER PRIMARY KEY CHECK ("id" = 1),
      "source_account_id" TEXT,
      "client_id" TEXT,
      "client_secret" TEXT,
      "mode" TEXT NOT NULL DEFAULT 'live',
      "destination" TEXT,
      "reserve" REAL NOT NULL DEFAULT 25,
      "threshold" REAL NOT NULL DEFAULT 1,
      "run_time" TEXT NOT NULL DEFAULT '23:30',
      "enabled" INTEGER NOT NULL DEFAULT 0,
      "updated_at" TEXT
    );
    CREATE TABLE IF NOT EXISTS "paypal_sweep_runs" (
      "id" TEXT PRIMARY KEY,
      "started_at" TEXT NOT NULL,
      "finished_at" TEXT,
      "trigger" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "available" REAL,
      "swept" REAL,
      "currency" TEXT,
      "batch_id" TEXT,
      "payout_batch_id" TEXT,
      "destination" TEXT,
      "error" TEXT,
      "detail" TEXT
    );
  `);
  tablesReady = true;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export function getSweepConfigRow() {
  ensureTables();
  const db = getDb();
  let row = db.prepare('SELECT * FROM "paypal_sweep_config" WHERE "id" = 1').get();
  if (!row) {
    db.prepare('INSERT INTO "paypal_sweep_config" ("id") VALUES (1)').run();
    row = db.prepare('SELECT * FROM "paypal_sweep_config" WHERE "id" = 1').get();
  }
  return row;
}

export function saveSweepConfig(input) {
  ensureTables();
  const db = getDb();
  const current = getSweepConfigRow();
  const next = {
    source_account_id: input.source_account_id !== undefined ? (input.source_account_id || null) : current.source_account_id,
    client_id: input.client_id !== undefined ? (String(input.client_id || '').trim() || null) : current.client_id,
    // Blank secret on save means "keep the stored one".
    client_secret: input.client_secret ? String(input.client_secret) : current.client_secret,
    mode: input.mode === 'sandbox' ? 'sandbox' : input.mode === 'live' ? 'live' : current.mode,
    destination: input.destination !== undefined ? (String(input.destination || '').trim() || null) : current.destination,
    reserve: Number.isFinite(Number(input.reserve)) && input.reserve !== undefined && input.reserve !== '' ? Math.max(0, Number(input.reserve)) : current.reserve,
    threshold: Number.isFinite(Number(input.threshold)) && input.threshold !== undefined && input.threshold !== '' ? Math.max(0, Number(input.threshold)) : current.threshold,
    run_time: /^\d{2}:\d{2}$/.test(String(input.run_time || '')) ? String(input.run_time) : current.run_time,
    enabled: input.enabled !== undefined ? (input.enabled ? 1 : 0) : current.enabled,
  };
  db.prepare(`
    UPDATE "paypal_sweep_config" SET
      "source_account_id" = ?, "client_id" = ?, "client_secret" = ?, "mode" = ?,
      "destination" = ?, "reserve" = ?, "threshold" = ?, "run_time" = ?,
      "enabled" = ?, "updated_at" = ?
    WHERE "id" = 1
  `).run(
    next.source_account_id, next.client_id, next.client_secret, next.mode,
    next.destination, next.reserve, next.threshold, next.run_time,
    next.enabled, new Date().toISOString(),
  );
  return getSweepConfigRow();
}

/** Config as safe to send to the browser: secrets are masked, never raw. */
export function publicSweepConfig(row = getSweepConfigRow()) {
  return {
    source_account_id: row.source_account_id || '',
    client_id: row.client_id || '',
    has_client_secret: Boolean(row.client_secret),
    client_secret_masked: row.client_secret ? '••••••••••••' : '',
    mode: row.mode || 'live',
    destination: row.destination || '',
    reserve: row.reserve ?? 25,
    threshold: row.threshold ?? 1,
    run_time: row.run_time || '23:30',
    enabled: Boolean(row.enabled),
    updated_at: row.updated_at || null,
  };
}

// ---------------------------------------------------------------------------
// Credential resolution (gateway account reuse first, then dedicated fields)
// ---------------------------------------------------------------------------
export function resolveCredentials(row = getSweepConfigRow()) {
  if (row.source_account_id) {
    const db = getDb();
    const acct = db.prepare('SELECT * FROM "paymentgatewayaccount" WHERE "id" = ?').get(row.source_account_id);
    if (!acct) return { error: 'The selected gateway account no longer exists.' };
    let keys = {};
    try { keys = JSON.parse(acct.api_keys || '{}'); } catch { keys = {}; }
    if (!keys.client_id || !keys.client_secret) {
      return { error: `Gateway account "${acct.account_name || acct.id}" is missing its PayPal client ID or secret.` };
    }
    return {
      clientId: keys.client_id,
      clientSecret: keys.client_secret,
      mode: keys.mode === 'sandbox' ? 'sandbox' : 'live',
      sourceLabel: acct.account_name || 'Gateway account',
    };
  }
  if (row.client_id && row.client_secret) {
    return { clientId: row.client_id, clientSecret: row.client_secret, mode: row.mode === 'sandbox' ? 'sandbox' : 'live', sourceLabel: 'Dedicated credentials' };
  }
  return { error: 'No PayPal credentials configured. Pick a PayPal gateway account or enter a client ID and secret.' };
}

export function paypalBase(mode) {
  if (process.env.PAYPAL_API_BASE_URL) return process.env.PAYPAL_API_BASE_URL.replace(/\/$/, '');
  return mode === 'sandbox' ? SANDBOX_BASE : LIVE_BASE;
}

// ---------------------------------------------------------------------------
// PayPal API calls
// ---------------------------------------------------------------------------
async function paypalFetch(base, pathName, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}${pathName}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep raw text */ }
  return { status: res.status, ok: res.ok, json, text };
}

export async function mintToken(base, clientId, clientSecret) {
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep raw */ }
  if (!res.ok || !json?.access_token) {
    throw new Error(`PayPal token request failed (HTTP ${res.status}): ${text.slice(0, 500)}`);
  }
  return json; // { access_token, scope, expires_in, ... }
}

/**
 * Read the AVAILABLE balance. Throws with PayPal's verbatim error on failure —
 * a balance is never invented.
 */
export async function fetchAvailableBalance(base, token) {
  const r = await paypalFetch(base, '/v1/reporting/balances', { token });
  if (!r.ok) {
    throw new Error(`PayPal balance request failed (HTTP ${r.status}): ${r.text.slice(0, 500)}`);
  }
  const balances = r.json?.balances || [];
  if (!balances.length) throw new Error('PayPal balance response contained no balances.');
  const entry = balances.find((b) => b.currency === 'USD') || balances[0];
  const available = Number(entry?.available_balance?.value);
  if (!Number.isFinite(available)) {
    throw new Error(`PayPal balance response had no readable available balance: ${r.text.slice(0, 300)}`);
  }
  return { available, currency: entry.currency || entry.available_balance?.currency_code || 'USD' };
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------
function recordRun(run) {
  ensureTables();
  const db = getDb();
  db.prepare(`
    INSERT INTO "paypal_sweep_runs"
      ("id","started_at","finished_at","trigger","status","available","swept","currency","batch_id","payout_batch_id","destination","error","detail")
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    run.id, run.started_at, run.finished_at || null, run.trigger, run.status,
    run.available ?? null, run.swept ?? null, run.currency || null, run.batch_id || null,
    run.payout_batch_id || null, run.destination || null, run.error || null, run.detail || null,
  );
  return run;
}

export function listSweepRuns(limit = 50) {
  ensureTables();
  const db = getDb();
  return db.prepare('SELECT * FROM "paypal_sweep_runs" ORDER BY "started_at" DESC LIMIT ?').all(Math.min(200, Math.max(1, limit)));
}

function chicagoParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return {
    dateStamp: `${parts.year}${parts.month}${parts.day}`,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}`,
  };
}

/** Deterministic per-day batch id: rerunning on the same day can never double-send. */
export function sweepBatchId(date = new Date()) {
  return `sweep-${chicagoParts(date).dateStamp}`;
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ---------------------------------------------------------------------------
// The sweep itself
// ---------------------------------------------------------------------------
export async function runSweep(trigger = 'manual') {
  const config = getSweepConfigRow();
  const run = {
    id: crypto.randomUUID(),
    started_at: new Date().toISOString(),
    trigger,
    status: 'failed',
    batch_id: sweepBatchId(),
    destination: config.destination || null,
  };
  const finish = (patch) => recordRun({ ...run, ...patch, finished_at: new Date().toISOString() });

  try {
    if (!config.destination) {
      return finish({ status: 'failed', error: 'No destination PayPal account configured.' });
    }
    const creds = resolveCredentials(config);
    if (creds.error) return finish({ status: 'failed', error: creds.error });

    // Idempotency: a successful send already recorded under today's batch id
    // means the day's sweep is done — never send twice.
    const db = getDb();
    const prior = db.prepare(
      'SELECT "id","payout_batch_id" FROM "paypal_sweep_runs" WHERE "batch_id" = ? AND "status" = ? LIMIT 1'
    ).get(run.batch_id, 'sent');
    if (prior) {
      return finish({
        status: 'skipped',
        payout_batch_id: prior.payout_batch_id || null,
        error: null,
        detail: `Already swept today under batch ${run.batch_id} (run ${prior.id}). No second payout was sent.`,
      });
    }

    const base = paypalBase(creds.mode);
    const token = (await mintToken(base, creds.clientId, creds.clientSecret)).access_token;
    const { available, currency } = await fetchAvailableBalance(base, token);
    run.available = available;
    run.currency = currency;

    const sweepAmount = round2(available - Number(config.reserve ?? 25));
    if (sweepAmount < Number(config.threshold ?? 1)) {
      return finish({
        status: 'skipped',
        swept: 0,
        detail: `Available ${available.toFixed(2)} ${currency} minus reserve ${Number(config.reserve ?? 25).toFixed(2)} leaves ${sweepAmount.toFixed(2)}, below the ${Number(config.threshold ?? 1).toFixed(2)} minimum threshold. Nothing sent.`,
      });
    }

    const isEmail = config.destination.includes('@');
    const payload = {
      sender_batch_header: {
        sender_batch_id: run.batch_id,
        recipient_type: isEmail ? 'EMAIL' : 'PAYPAL_ID',
        email_subject: 'Daily balance sweep',
        email_message: 'Daily balance sweep',
      },
      items: [
        {
          recipient_type: isEmail ? 'EMAIL' : 'PAYPAL_ID',
          amount: { value: sweepAmount.toFixed(2), currency },
          receiver: config.destination,
          note: 'Daily balance sweep',
          sender_item_id: `${run.batch_id}-1`,
        },
      ],
    };
    const r = await paypalFetch(base, '/v1/payments/payouts', { method: 'POST', token, body: payload });
    if (r.status === 403) {
      return finish({
        status: 'failed',
        swept: 0,
        error: 'Payouts does not appear to be enabled on the source account',
        detail: `PayPal returned HTTP 403 for the payout request. Raw response: ${r.text.slice(0, 800)}`,
      });
    }
    if (!r.ok) {
      return finish({
        status: 'failed',
        swept: 0,
        error: `PayPal payout request failed (HTTP ${r.status})`,
        detail: r.text.slice(0, 800),
      });
    }
    return finish({
      status: 'sent',
      swept: sweepAmount,
      payout_batch_id: r.json?.batch_header?.payout_batch_id || null,
      detail: `Payout accepted by PayPal in ${creds.mode} mode from ${creds.sourceLabel}.`,
    });
  } catch (err) {
    return finish({ status: 'failed', error: err.message || String(err) });
  }
}

/**
 * Connection test. Minting a token alone proves nothing, so this also reads
 * the balance the sweep depends on and inspects the granted token scopes for
 * the payouts scope. It never sends a payout.
 */
export async function testSweepConnection() {
  const config = getSweepConfigRow();
  const creds = resolveCredentials(config);
  if (creds.error) return { ok: false, stage: 'config', error: creds.error };
  const base = paypalBase(creds.mode);
  const out = { ok: false, mode: creds.mode, base, source: creds.sourceLabel };
  let tokenJson;
  try {
    tokenJson = await mintToken(base, creds.clientId, creds.clientSecret);
    out.token_ok = true;
  } catch (err) {
    return { ...out, stage: 'token', error: err.message };
  }
  const scopes = String(tokenJson.scope || '').split(/\s+/).filter(Boolean);
  out.scopes = scopes;
  out.payouts_scope = scopes.some((s) => s.toLowerCase().includes('payouts'));
  try {
    const bal = await fetchAvailableBalance(base, tokenJson.access_token);
    out.balance_ok = true;
    out.available = bal.available;
    out.currency = bal.currency;
  } catch (err) {
    return { ...out, stage: 'balances', error: err.message };
  }
  out.ok = true;
  if (!out.payouts_scope) {
    out.warning = 'The granted token scopes do not list a payouts scope. Balance reading works, but payouts may still be refused until Payouts is enabled on the source account — the first real run will confirm.';
  }
  return out;
}

// ---------------------------------------------------------------------------
// Daily scheduler: interval check against the configured Chicago run time.
// ---------------------------------------------------------------------------
let schedulerStarted = false;
export function startSweepScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const tick = async () => {
    try {
      const config = getSweepConfigRow();
      if (!config.enabled) return;
      const now = chicagoParts();
      if (now.time < (config.run_time || '23:30')) return;
      const db = getDb();
      const batchId = sweepBatchId();
      const attempted = db.prepare(
        'SELECT "id" FROM "paypal_sweep_runs" WHERE "batch_id" = ? AND "trigger" = ? LIMIT 1'
      ).get(batchId, 'scheduled');
      if (attempted) return;
      await runSweep('scheduled');
    } catch (err) {
      console.error('[paypal-sweep] scheduler tick failed:', err.message);
    }
  };
  const timer = setInterval(tick, 60_000);
  timer.unref();
  tick();
}
