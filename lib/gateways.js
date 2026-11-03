/**
 * Payment gateway engine (Stripe + PayPal), self-hosted.
 *
 * Replaces the Base44-era stubs on the Payment Gateways page:
 *   - Stripe Checkout session creation for the public checkout flow
 *     (was: a Base44 backend function `createCheckoutSession`).
 *   - Webhook ingestion for both providers (signature-verified), recording
 *     payments into PaymentHistory with transaction-id dedupe.
 *   - Live sync: pulls recent charges + subscriptions from Stripe and
 *     recent transactions from PayPal (Transaction Search), staging new
 *     subscriptions as SubscriptionMigration rows and payments as
 *     PaymentHistory rows. Runs manually (Sync Now) and hourly.
 *
 * Credentials come from the operator's own PaymentGatewayAccount records
 * (api_keys), exactly as entered in the admin UI. Nothing here talks to
 * Base44. STRIPE_API_BASE_URL / PAYPAL_API_BASE_URL override the provider
 * hosts for local stub testing.
 */

import crypto from 'node:crypto';
import { findRecord, findRecords, insertRecord, updateRecord } from './records.js';

const STRIPE_BASE = () => (process.env.STRIPE_API_BASE_URL || 'https://api.stripe.com').replace(/\/$/, '');
const PAYPAL_BASE = (mode) =>
  (process.env.PAYPAL_API_BASE_URL ||
    (mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com')).replace(/\/$/, '');

function accountKeys(account) {
  return account?.api_keys && typeof account.api_keys === 'object' ? account.api_keys : {};
}

export function getGatewayAccount(id) {
  if (!id) return null;
  return findRecord('PaymentGatewayAccount', (a) => a.id === id);
}

export function activeAccounts(provider) {
  return findRecords(
    'PaymentGatewayAccount',
    (a) => (!provider || a.provider === provider) && a.is_active !== false
  );
}

// ---------------------------------------------------------------------------
// Stripe REST helpers
// ---------------------------------------------------------------------------

async function stripeRequest(account, method, path, params) {
  const keys = accountKeys(account);
  if (!keys.secret_key) throw new Error('Stripe secret key is not configured on this gateway account.');
  const init = {
    method,
    headers: { Authorization: `Bearer ${keys.secret_key}` },
  };
  if (params) {
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(params).toString();
  }
  const res = await fetch(`${STRIPE_BASE()}${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe API error (${res.status})`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Checkout (replaces the createCheckoutSession backend function)
// ---------------------------------------------------------------------------

export async function createCheckoutSession({ priceId, successUrl, cancelUrl } = {}) {
  if (!priceId) throw Object.assign(new Error('priceId is required'), { status: 400 });
  // The price must belong to a plan on this instance (prevents using the
  // endpoint as a generic Stripe-session proxy for arbitrary prices).
  const plan = findRecord('StorePlan', (p) => p.stripe_price_id === priceId);
  if (!plan) {
    throw Object.assign(new Error('No plan on this instance uses that Stripe price.'), { status: 404 });
  }
  const account = activeAccounts('stripe')[0];
  if (!account) {
    throw Object.assign(
      new Error('Stripe checkout is not configured: add an active Stripe gateway account with a secret key in Billing → Payment Gateways.'),
      { status: 400 }
    );
  }
  const session = await stripeRequest(account, 'POST', '/v1/checkout/sessions', {
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: successUrl || '',
    cancel_url: cancelUrl || successUrl || '',
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL.');
  return { id: session.id, url: session.url };
}

// ---------------------------------------------------------------------------
// Payment recording (shared by webhooks + sync) — deduped by transaction_id
// ---------------------------------------------------------------------------

function recordPayment(fields) {
  const existing = fields.transaction_id
    ? findRecord('PaymentHistory', (p) => p.transaction_id === fields.transaction_id && p.processor === fields.processor)
    : null;
  if (existing) {
    // Keep the first record, but let terminal states (refund/dispute)
    // supersede an earlier success for the same transaction.
    if (fields.status && fields.status !== existing.status &&
        (fields.status === 'refunded' || fields.status === 'disputed')) {
      return updateRecord('PaymentHistory', existing.id, { status: fields.status });
    }
    return existing;
  }
  return insertRecord('PaymentHistory', fields);
}

function stripeChargeToPayment(charge) {
  let status = 'pending';
  if (charge.status === 'succeeded') status = charge.amount_refunded > 0 ? 'refunded' : 'success';
  else if (charge.status === 'failed') status = 'failed';
  return {
    billing_customer_id: null,
    customer_email: charge.billing_details?.email || charge.receipt_email || null,
    customer_name: charge.billing_details?.name || null,
    processor: 'stripe',
    amount: (charge.amount || 0) / 100,
    currency: String(charge.currency || 'usd').toUpperCase(),
    status,
    transaction_id: charge.id,
    invoice_number: typeof charge.invoice === 'string' ? charge.invoice : null,
    payment_date: charge.created ? new Date(charge.created * 1000).toISOString() : new Date().toISOString(),
    failure_reason: charge.failure_message || null,
    plan_name: null,
    billing_cycle: null,
    raw_metadata: { source: 'stripe', object: 'charge', id: charge.id },
    imported_from_migration: false,
  };
}

// ---------------------------------------------------------------------------
// Stripe webhooks
// ---------------------------------------------------------------------------

export function verifyStripeSignature(account, rawBody, signatureHeader) {
  const keys = accountKeys(account);
  if (!keys.webhook_secret) {
    throw Object.assign(new Error('Webhook secret is not configured on this Stripe account.'), { status: 400 });
  }
  if (!signatureHeader) {
    throw Object.assign(new Error('Missing Stripe-Signature header.'), { status: 400 });
  }
  const parts = Object.fromEntries(
    String(signatureHeader).split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    })
  );
  const timestamp = Number.parseInt(parts.t, 10);
  const signatures = String(signatureHeader).split(',').filter((s) => s.startsWith('v1=')).map((s) => s.slice(3));
  if (!timestamp || !signatures.length) {
    throw Object.assign(new Error('Malformed Stripe-Signature header.'), { status: 400 });
  }
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
    throw Object.assign(new Error('Stripe webhook timestamp is outside the tolerance window.'), { status: 400 });
  }
  const expected = crypto
    .createHmac('sha256', keys.webhook_secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');
  const ok = signatures.some((sig) => {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
  if (!ok) {
    throw Object.assign(new Error('Stripe webhook signature verification failed.'), { status: 400 });
  }
}

export function handleStripeEvent(event) {
  const obj = event?.data?.object || {};
  switch (event?.type) {
    case 'charge.succeeded':
    case 'charge.failed':
    case 'charge.refunded':
      return recordPayment(stripeChargeToPayment(obj));
    case 'charge.dispute.created':
      return recordPayment({
        ...stripeChargeToPayment(obj.charge ? { id: obj.charge, status: 'succeeded' } : obj),
        transaction_id: obj.charge || obj.id,
        status: 'disputed',
        amount: (obj.amount || 0) / 100,
        currency: String(obj.currency || 'usd').toUpperCase(),
      });
    default:
      return null; // acknowledged, not recorded
  }
}

// ---------------------------------------------------------------------------
// PayPal REST helpers
// ---------------------------------------------------------------------------

async function paypalToken(account) {
  const keys = accountKeys(account);
  if (!keys.client_id || !keys.client_secret) {
    throw new Error('PayPal client ID/secret are not configured on this gateway account.');
  }
  const res = await fetch(`${PAYPAL_BASE(keys.mode)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keys.client_id}:${keys.client_secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error_description || `PayPal token request failed (${res.status})`);
  }
  return data.access_token;
}

async function paypalRequest(account, path, { method = 'GET', body } = {}) {
  const token = await paypalToken(account);
  const res = await fetch(`${PAYPAL_BASE(accountKeys(account).mode)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error_description || `PayPal API error (${res.status})`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// PayPal webhooks
// ---------------------------------------------------------------------------

export async function verifyPaypalWebhook(account, headers, event) {
  const keys = accountKeys(account);
  if (!keys.webhook_id) {
    throw Object.assign(new Error('Webhook ID is not configured on this PayPal account.'), { status: 400 });
  }
  const result = await paypalRequest(account, '/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: keys.webhook_id,
      webhook_event: event,
    },
  });
  if (result.verification_status !== 'SUCCESS') {
    throw Object.assign(new Error('PayPal webhook signature verification failed.'), { status: 400 });
  }
}

export function handlePaypalEvent(event) {
  const resource = event?.resource || {};
  const amount = resource.amount || resource.transaction_amount || {};
  const base = {
    billing_customer_id: null,
    customer_email: resource.payer_info?.email_address || resource.payer?.email_address || null,
    customer_name: null,
    processor: 'paypal',
    amount: Number.parseFloat(amount.value ?? amount.total ?? 0) || 0,
    currency: String(amount.currency_code || amount.currency || 'USD').toUpperCase(),
    transaction_id: resource.id || null,
    invoice_number: resource.invoice_id || null,
    payment_date: resource.create_time || resource.transaction_initiation_date || new Date().toISOString(),
    failure_reason: null,
    plan_name: null,
    billing_cycle: null,
    raw_metadata: { source: 'paypal', event_type: event?.event_type || null, id: resource.id || null },
    imported_from_migration: false,
  };
  switch (event?.event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED':
    case 'PAYMENT.SALE.COMPLETED':
      return recordPayment({ ...base, status: 'success' });
    case 'PAYMENT.CAPTURE.REFUNDED':
    case 'PAYMENT.SALE.REFUNDED':
      return recordPayment({ ...base, status: 'refunded' });
    case 'PAYMENT.CAPTURE.DENIED':
      return recordPayment({ ...base, status: 'failed', failure_reason: 'Capture denied' });
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Live sync
// ---------------------------------------------------------------------------

const CYCLE_MAP = { day: 'weekly', week: 'weekly', month: 'monthly', year: 'yearly' };

async function syncStripe(account) {
  let pulled = 0;
  let updated = 0;

  const charges = await stripeRequest(account, 'GET', '/v1/charges?limit=100');
  for (const charge of charges.data || []) {
    pulled++;
    const before = findRecord('PaymentHistory', (p) => p.transaction_id === charge.id && p.processor === 'stripe');
    recordPayment(stripeChargeToPayment(charge));
    if (!before) updated++;
  }

  const subs = await stripeRequest(account, 'GET', '/v1/subscriptions?status=all&limit=100');
  const customerCache = new Map();
  for (const sub of subs.data || []) {
    pulled++;
    const staged = findRecord('SubscriptionMigration', (m) => m.source === 'stripe' && m.source_subscription_id === sub.id);
    if (staged) continue;
    let email = null;
    let name = null;
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    if (customerId) {
      if (!customerCache.has(customerId)) {
        try {
          const cust = await stripeRequest(account, 'GET', `/v1/customers/${encodeURIComponent(customerId)}`);
          customerCache.set(customerId, cust);
        } catch { customerCache.set(customerId, null); }
      }
      const cust = customerCache.get(customerId);
      email = cust?.email || null;
      name = cust?.name || null;
    }
    const item = (sub.items?.data || [])[0] || {};
    const price = item.price || {};
    insertRecord('SubscriptionMigration', {
      source: 'stripe',
      source_customer_id: customerId || null,
      source_subscription_id: sub.id,
      customer_email: email,
      customer_name: name,
      original_plan_name: price.nickname || price.id || 'Stripe subscription',
      original_price: typeof price.unit_amount === 'number' ? price.unit_amount / 100 : null,
      original_currency: String(price.currency || 'usd').toUpperCase(),
      billing_cycle: CYCLE_MAP[price.recurring?.interval] || 'monthly',
      signup_date: sub.created ? new Date(sub.created * 1000).toISOString() : null,
      next_billing_date: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      status: 'pending',
      raw_metadata: { source: 'stripe', subscription_id: sub.id, status: sub.status },
    });
    updated++;
  }
  return { pulled, updated };
}

async function syncPaypal(account) {
  let pulled = 0;
  let updated = 0;
  const end = new Date();
  const start = new Date(end.getTime() - 31 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/\.\d{3}Z$/, '-0000');
  const data = await paypalRequest(
    account,
    `/v1/reporting/transactions?start_date=${encodeURIComponent(fmt(start))}&end_date=${encodeURIComponent(fmt(end))}&fields=all&page_size=100`
  );
  const STATUS_MAP = { S: 'success', P: 'pending', D: 'failed', V: 'refunded' };
  for (const entry of data.transaction_details || []) {
    const info = entry.transaction_info || {};
    if (!info.transaction_id) continue;
    pulled++;
    const before = findRecord('PaymentHistory', (p) => p.transaction_id === info.transaction_id && p.processor === 'paypal');
    recordPayment({
      billing_customer_id: null,
      customer_email: entry.payer_info?.email_address || null,
      customer_name: entry.payer_info?.payer_name?.alternate_full_name || null,
      processor: 'paypal',
      amount: Number.parseFloat(info.transaction_amount?.value || 0) || 0,
      currency: String(info.transaction_amount?.currency_code || 'USD').toUpperCase(),
      status: STATUS_MAP[info.transaction_status] || 'success',
      transaction_id: info.transaction_id,
      invoice_number: info.invoice_id || null,
      payment_date: info.transaction_initiation_date || new Date().toISOString(),
      failure_reason: null,
      plan_name: null,
      billing_cycle: null,
      raw_metadata: { source: 'paypal', transaction_id: info.transaction_id },
      imported_from_migration: false,
    });
    if (!before) updated++;
  }
  return { pulled, updated };
}

/**
 * Run a sync for one account. Records a SyncLog either way and updates the
 * account's sync_status / last_synced_at / error_message. Re-throws the
 * underlying error after recording it (manual callers surface it; the
 * scheduler logs and moves on).
 */
export async function syncGatewayAccount(account, trigger = 'manual') {
  const log = insertRecord('SyncLog', {
    gateway_account_id: account.id,
    status: 'started',
    records_pulled: 0,
    records_updated: 0,
    trigger,
  });
  updateRecord('PaymentGatewayAccount', account.id, { sync_status: 'in_progress', error_message: null });
  try {
    const result = account.provider === 'paypal' ? await syncPaypal(account) : await syncStripe(account);
    updateRecord('SyncLog', log.id, {
      status: 'completed',
      records_pulled: result.pulled,
      records_updated: result.updated,
    });
    updateRecord('PaymentGatewayAccount', account.id, {
      sync_status: 'idle',
      last_synced_at: new Date().toISOString(),
      error_message: null,
    });
    return result;
  } catch (err) {
    updateRecord('SyncLog', log.id, { status: 'failed', error_details: err.message || String(err) });
    updateRecord('PaymentGatewayAccount', account.id, {
      sync_status: 'failed',
      error_message: err.message || String(err),
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Hourly automatic sync (the old "60-minute cron", now real)
// ---------------------------------------------------------------------------

const SYNC_INTERVAL_MS = 60 * 60 * 1000;
let syncTimer = null;

export function startGatewaySyncScheduler() {
  if (syncTimer) return;
  if (process.env.GATEWAY_SYNC_DISABLED === '1') {
    console.log('[gateways] automatic sync disabled (GATEWAY_SYNC_DISABLED=1)');
    return;
  }
  syncTimer = setInterval(async () => {
    for (const account of activeAccounts()) {
      if (account.sync_status === 'in_progress') continue;
      try {
        await syncGatewayAccount(account, 'automated');
      } catch (err) {
        console.error(`[gateways] auto-sync failed for ${account.account_name || account.id}:`, err.message);
      }
    }
  }, SYNC_INTERVAL_MS);
  if (typeof syncTimer.unref === 'function') syncTimer.unref();
  console.log('[gateways] automatic hourly sync scheduled');
}
