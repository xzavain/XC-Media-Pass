// CSV helpers for BillingCustomer bulk export/import.
// Columns are human-readable (plan_name instead of plan_id) so the file is editable in Excel/Sheets.

export const CSV_COLUMNS = ["user_name", "email", "status", "bill_date", "payment_method", "billed_price", "plan_name"];

function escapeCsvValue(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function customersToCsv(customers, plans) {
  const planNameById = Object.fromEntries(plans.map((p) => [p.id, p.name]));
  const rows = customers.map((c) => [
    c.user_name,
    c.email,
    c.status,
    c.bill_date,
    c.payment_method,
    c.billed_price,
    planNameById[c.plan_id] || "",
  ]);
  const lines = [CSV_COLUMNS.join(","), ...rows.map((r) => r.map(escapeCsvValue).join(","))];
  return lines.join("\n");
}

export function downloadCsv(filename, csvString) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { current += char; }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ",") { values.push(current); current = ""; }
      else current += char;
    }
  }
  values.push(current);
  return values;
}

// Parses CSV text into row objects keyed by CSV_COLUMNS, resolving plan_name to plan_id.
// Returns { rows, errors } where errors lists row numbers with an unrecognized plan_name.
export function parseCustomersCsv(csvText, plans) {
  const planIdByName = Object.fromEntries(plans.map((p) => [p.name.trim().toLowerCase(), p.id]));
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], errors: [] };

  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const record = {};
    header.forEach((col, idx) => { record[col] = (values[idx] ?? "").trim(); });

    const planId = planIdByName[(record.plan_name || "").trim().toLowerCase()];
    if (!planId) {
      errors.push(`Row ${i + 1}: unknown plan "${record.plan_name}"`);
      continue;
    }

    rows.push({
      user_name: record.user_name,
      email: record.email,
      status: record.status || "ACTIVE",
      bill_date: record.bill_date,
      payment_method: record.payment_method,
      billed_price: parseFloat(record.billed_price) || 0,
      plan_id: planId,
    });
  }

  return { rows, errors };
}

export function customersTemplateCsv(plans) {
  const examplePlan = plans[0]?.name || "Plan Name";
  const lines = [
    CSV_COLUMNS.join(","),
    ["Jane Doe", "jane@example.com", "ACTIVE", "2025-01-15", "PayPal", "17", examplePlan].join(","),
  ];
  return lines.join("\n");
}