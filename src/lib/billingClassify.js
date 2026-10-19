// Product classification + plan matching engine.
// Classifies a raw gateway product name into a SubscriptionCategory using
// each category's match_tokens (substring or regex), and matches a plan
// via normalized_identifier substring.

export function classifyProduct(rawName, categories) {
  if (!rawName) return null;
  const name = String(rawName).toLowerCase();
  for (const cat of categories || []) {
    const tokens = (cat.match_tokens || []).filter(Boolean);
    for (const t of tokens) {
      const token = String(t).toLowerCase();
      if (!token) continue;
      const isRegex = /[[\\^$.|?*+()]/.test(token);
      try {
        if (isRegex ? new RegExp(token, "i").test(name) : name.includes(token)) {
          return { category_id: cat.id, matched_token: t };
        }
      } catch {}
    }
  }
  return null;
}

export function matchPlan(rawName, plans) {
  if (!rawName) return null;
  const name = String(rawName).toLowerCase();
  const sorted = [...(plans || [])]
    .filter((p) => p.normalized_identifier)
    .sort((a, b) => (b.normalized_identifier || "").length - (a.normalized_identifier || "").length);
  for (const p of sorted) {
    if (name.includes(String(p.normalized_identifier).toLowerCase())) return p;
  }
  return null;
}

// Keep an existing valid category, otherwise classify. Null = Uncategorized bucket.
export function resolveCategory(rawName, categories, existingCategoryId) {
  if (existingCategoryId && (categories || []).some((c) => c.id === existingCategoryId)) return existingCategoryId;
  const match = classifyProduct(rawName, categories);
  return match ? match.category_id : null;
}