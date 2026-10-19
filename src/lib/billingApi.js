import { base44 } from "@/api/base44Client";
import { classifyProduct, matchPlan } from "@/lib/billingClassify";

// ─── CSV parsing (client-side, no upload needed) ───
function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

export function parseCsv(text) {
  const lines = (text || "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] || "").trim(); });
    rows.push(row);
  }
  return rows;
}

const NUM = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const DATE = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// Import parsed rows into SubscriptionCustomer + Subscription records for a gateway.
export async function importRows(rows, gatewayAccountId, categories, plans) {
  const summary = { created_customers: 0, created_subs: 0, updated_subs: 0, errors: [] };
  if (!rows.length) return summary;

  const [existingCusts, existingSubs] = await Promise.all([
    base44.entities.SubscriptionCustomer.filter({ gateway_account_id: gatewayAccountId }, { limit: 1000 }),
    base44.entities.Subscription.filter({ gateway_account_id: gatewayAccountId }, { limit: 1000 }),
  ]);
  const custByEmail = new Map();
  const custArr = existingCusts.items || existingCusts || [];
  for (const c of custArr) custByEmail.set(String(c.email || "").toLowerCase(), c);
  const subByExt = new Map();
  const subArr = existingSubs.items || existingSubs || [];
  for (const s of subArr) if (s.external_subscription_id) subByExt.set(s.external_subscription_id, s);

  const newCustomers = [];
  const newSubs = [];
  const updateSubs = [];
  const cache = new Map(custByEmail);

  for (const row of rows) {
    try {
      const email = (row.customer_email || row.email || "").toLowerCase();
      let customer = email ? cache.get(email) : null;
      if (!customer) {
        customer = {
          gateway_account_id: gatewayAccountId,
          external_customer_id: row.external_customer_id || email || null,
          name: row.customer_name || row.name || row.customer_email || "Unknown",
          email: row.customer_email || row.email || "",
          phone: row.customer_phone || row.phone || null,
          metadata: {},
        };
        newCustomers.push(customer);
        cache.set(email, customer);
      }
      const catMatch = classifyProduct(row.raw_product_name || row.product_name, categories);
      const plan = matchPlan(row.raw_product_name || row.product_name, plans);
      const extId = row.external_subscription_id || null;
      const subData = {
        gateway_account_id: gatewayAccountId,
        customer_id: customer.id || null,
        category_id: catMatch ? catMatch.category_id : null,
        plan_id: plan ? plan.id : null,
        external_subscription_id: extId,
        raw_product_name: row.raw_product_name || row.product_name || "",
        amount: NUM(row.amount),
        currency: row.currency || "USD",
        billing_interval: row.billing_interval || "month",
        status: row.status || "active",
        current_period_start: DATE(row.current_period_start),
        next_billing_date: DATE(row.next_billing_date || row.next_due_date),
        cancel_at_period_end: String(row.cancel_at_period_end || "").toLowerCase() === "true",
        last_synced_at: new Date().toISOString(),
      };
      if (extId && subByExt.has(extId)) {
        updateSubs.push({ id: subByExt.get(extId).id, ...subData });
      } else {
        newSubs.push({ ...subData, _customerRef: customer });
      }
    } catch (err) {
      summary.errors.push({ row, error: err.message });
    }
  }

  if (newCustomers.length) {
    const res = await base44.entities.SubscriptionCustomer.bulkCreate(newCustomers);
    const arr = Array.isArray(res) ? res : res.records || [];
    arr.forEach((c, idx) => { newCustomers[idx].id = c.id; });
    summary.created_customers = arr.length;
  }
  const subPayload = newSubs.map(({ _customerRef, ...s }) => ({
    ...s,
    customer_id: _customerRef?.id || s.customer_id,
  }));
  if (subPayload.length) {
    const res = await base44.entities.Subscription.bulkCreate(subPayload);
    summary.created_subs = (Array.isArray(res) ? res : res.records || []).length;
  }
  if (updateSubs.length) {
    await base44.entities.Subscription.bulkUpdate(updateSubs);
    summary.updated_subs = updateSubs.length;
  }
  return summary;
}

// ─── Export helpers ───
function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows, headers) {
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h])).join(","));
  return lines.join("\n");
}
export function downloadFile(filename, content, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const STATUS_COLORS = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  past_due: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  canceled: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  trialing: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  paused: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};