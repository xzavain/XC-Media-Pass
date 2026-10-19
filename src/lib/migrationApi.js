// Helpers for the subscription migration pipeline.
// Parses pasted/CSV data from Stripe and PayPal into SubscriptionMigration
// and PaymentHistory records. Actual live API calls require backend functions
// (Builder+); this module handles the data mapping and batch ingestion so
// admins can paste exported API responses or CSV dumps directly.

import { base44 } from "@/api/base44Client";

// Parse Stripe subscriptions (as returned by Subscriptions API list)
export function parseStripeSubscriptions(jsonText) {
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid JSON — paste a valid Stripe API response");
  }
  const subs = Array.isArray(data) ? data : data.data || [];
  if (!Array.isArray(subs)) throw new Error("Could not find a subscriptions array in the JSON");

  return subs.map((s) => ({
    source: "stripe",
    source_customer_id: s.customer || "",
    source_subscription_id: s.id || "",
    customer_email: s.customer_email || s.metadata?.email || "",
    customer_name: s.metadata?.name || s.customer_name || "",
    original_plan_name: s.plan?.nickname || s.metadata?.plan || "Stripe Subscription",
    original_price: (s.plan?.amount || 0) / 100,
    original_currency: (s.plan?.currency || "usd").toUpperCase(),
    billing_cycle: mapStripeCycle(s.plan?.interval),
    signup_date: s.start_date ? new Date(s.start_date * 1000).toISOString() : s.created ? new Date(s.created * 1000).toISOString() : null,
    next_billing_date: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString().split("T")[0] : null,
    raw_metadata: s,
    status: "pending",
  }));
}

function mapStripeCycle(interval) {
  const i = (interval || "").toLowerCase();
  if (i === "month") return "monthly";
  if (i === "year") return "yearly";
  if (i === "week") return "weekly";
  if (i === "quarter") return "quarterly";
  return "monthly";
}

// Parse PayPal recurring payments (as returned by Billing Plans / Subscriptions API)
export function parsePaypalSubscriptions(jsonText) {
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid JSON — paste a valid PayPal API response");
  }
  const subs = Array.isArray(data) ? data : data.subscriptions || data.data || [];
  if (!Array.isArray(subs)) throw new Error("Could not find a subscriptions array in the JSON");

  return subs.map((s) => ({
    source: "paypal",
    source_customer_id: s.subscriber_id || s.payer_id || "",
    source_subscription_id: s.id || "",
    customer_email: s.subscriber?.email_address || s.payer_info?.email_address || "",
    customer_name: s.subscriber?.name?.given_name ? `${s.subscriber.name.given_name} ${s.subscriber.name.surname || ""}`.trim() : s.payer_info?.email_address || "",
    original_plan_name: s.plan_id || s.description || "PayPal Subscription",
    original_price: parseFloat(s.billing_info?.last_payment?.amount?.value || s.cost || 0) || 0,
    original_currency: s.billing_info?.last_payment?.amount?.currency_code || "USD",
    billing_cycle: "monthly",
    signup_date: s.start_time || s.create_time || null,
    next_billing_date: s.billing_info?.next_billing_time || null,
    raw_metadata: s,
    status: "pending",
  }));
}

// Parse a CSV of payment logs into PaymentHistory rows
// Expected columns: email, processor, amount, status, transaction_id, payment_date, failure_reason
export function parsePaymentLogsCsv(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] || ""; });
    return {
      customer_email: row.email || "",
      customer_name: row.name || "",
      processor: (row.processor || "manual").toLowerCase(),
      amount: parseFloat(row.amount || 0) || 0,
      currency: row.currency || "USD",
      status: (row.status || "success").toLowerCase(),
      transaction_id: row.transaction_id || row.txn_id || "",
      invoice_number: row.invoice || "",
      payment_date: row.payment_date || new Date().toISOString(),
      failure_reason: row.failure_reason || "",
      imported_from_migration: true,
    };
  });
}

// Ingest a batch of parsed migration rows into SubscriptionMigration records.
// Does NOT create BillingCustomer records or send emails — staged/silent import.
export async function ingestMigrationBatch(rows, actor, batchId) {
  const records = rows.map((r) => ({
    ...r,
    batch_id: batchId,
    migrated_at: new Date().toISOString(),
    migrated_by_name: actor?.name || "",
    migrated_by_email: actor?.email || "",
  }));
  return base44.entities.SubscriptionMigration.bulkCreate(records);
}

// Ingest parsed payment log rows into PaymentHistory records
export async function ingestPaymentLogs(rows) {
  return base44.entities.PaymentHistory.bulkCreate(rows);
}

// Activate a migration: create or update a BillingCustomer from the migration row
// and mark the migration as activated. Silent — no emails sent.
export async function activateMigration(migration, planId, actor) {
  const existing = await base44.entities.BillingCustomer.filter({ email: migration.customer_email });
  let customerId;

  if (existing.length > 0) {
    const cust = existing[0];
    await base44.entities.BillingCustomer.update(cust.id, {
      plan_id: planId,
      billed_price: migration.original_price,
      payment_method: migration.source === "stripe" ? "Stripe" : "PayPal",
      billing_cycle: migration.billing_cycle,
      source: migration.source,
      source_customer_id: migration.source_customer_id,
      original_signup_date: migration.signup_date,
      migration_status: "activated",
      status: "ACTIVE",
    });
    customerId = cust.id;
  } else {
    const created = await base44.entities.BillingCustomer.create({
      user_name: migration.customer_name || migration.customer_email,
      email: migration.customer_email,
      status: "ACTIVE",
      bill_date: migration.next_billing_date || new Date().toISOString().split("T")[0],
      payment_method: migration.source === "stripe" ? "Stripe" : "PayPal",
      billed_price: migration.original_price || 0,
      plan_id: planId,
      billing_cycle: migration.billing_cycle || "monthly",
      source: migration.source,
      source_customer_id: migration.source_customer_id,
      original_signup_date: migration.signup_date,
      migration_status: "activated",
      welcome_email_sent: false,
    });
    customerId = created.id;
  }

  await base44.entities.SubscriptionMigration.update(migration.id, {
    status: "activated",
    imported_customer_id: customerId,
    mapped_plan_id: planId,
    activated_at: new Date().toISOString(),
  });

  return customerId;
}

export function generateBatchId() {
  return `mig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}