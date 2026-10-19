// Shortcode replacement for email/Discord templates.
// Shortcodes use the *key* format (asterisk-delimited), e.g. *name*, *plan*, *price*.

export const AVAILABLE_SHORTCODES = [
  { key: "name", label: "Customer First Name", description: "First word of the customer name" },
  { key: "email", label: "Customer Email", description: "Full email address" },
  { key: "full_name", label: "Customer Full Name", description: "Complete customer name" },
  { key: "plan", label: "Plan Name", description: "Current subscription plan name" },
  { key: "price", label: "Billed Price", description: "Formatted price with currency" },
  { key: "bill_date", label: "Next Bill Date", description: "Next recurring billing date" },
  { key: "billing_cycle", label: "Billing Cycle", description: "monthly, yearly, etc." },
  { key: "portal_link", label: "Portal Link", description: "URL to the customer self-service portal" },
  { key: "store_link", label: "Store Link", description: "URL to the storefront" },
  { key: "support_link", label: "Support Link", description: "URL to the support desk" },
];

export function extractShortcodes(text) {
  if (!text) return [];
  const matches = text.match(/\*(\w+)\*/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\*/g, "")))];
}

export function applyShortcodes(text, context) {
  if (!text) return "";
  return text.replace(/\*(\w+)\*/g, (match, key) => {
    if (key in context && context[key] !== null && context[key] !== undefined) {
      return String(context[key]);
    }
    return match;
  });
}

// Build a shortcode context object from a BillingCustomer + resolved plan
export function buildTemplateContext(customer, plan, opts = {}) {
  const firstName = (customer.user_name || "").split(" ")[0] || "there";
  const portalLink = `${window.location.origin}/portal`;
  const storeLink = `${window.location.origin}/store`;
  const supportLink = `${window.location.origin}/my-tickets`;
  return {
    name: firstName,
    full_name: customer.user_name || "",
    email: customer.email || "",
    plan: plan?.name || "your current plan",
    price: customer.billed_price != null ? `$${customer.billed_price.toFixed(2)}` : "",
    bill_date: customer.bill_date || "",
    billing_cycle: customer.billing_cycle || "monthly",
    portal_link: portalLink,
    store_link: storeLink,
    support_link: supportLink,
    ...opts,
  };
}