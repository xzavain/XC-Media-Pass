/**
 * Server-side RLS (row-level security) enforcement.
 *
 * Each entity schema carries an `rls` object with rules per operation:
 *   { create: <rule>, read: <rule>, update: <rule>, delete: <rule> }
 *
 * Rule shapes:
 *   - null                       -> public: anyone (even unauthenticated) may pass
 *   - { user_condition: { role } } -> the user's role must match; `role` may be
 *                                     a string or a list of strings. The 'admin'
 *                                     role is treated as a superuser and always
 *                                     passes role checks.
 *   - { 'data.<field>': '{{user.id}}' | '{{user.email}}' | literal }
 *                                    -> the record's field must equal the user's
 *                                     id/email (or the literal). If the record
 *                                     field holds an array, membership is checked.
 *   - { $or: [...] } / { $and: [...] } -> combinators over sub-rules.
 *
 * Unauthenticated requests only pass rules that are `null`; everything else
 * fails. Entities without an `rls` block default to admin-only (deny by
 * default for non-admins).
 */

function substituteUser(value, user) {
  return String(value)
    .replaceAll('{{user.id}}', user?.id ?? '')
    .replaceAll('{{user.email}}', user?.email ?? '');
}

/**
 * Evaluate a single RLS rule.
 * @param {object|null} rule - the rule for this operation
 * @param {{id:string,email:string,role:string}|null} user - authenticated user or null
 * @param {object|null} record - decoded record (for create: the new record)
 * @returns {boolean}
 */
export function checkRule(rule, user, record) {
  if (rule === null || rule === undefined) return true; // public
  if (!user) return false; // unauthenticated: only null rules pass
  if (typeof rule !== 'object' || Array.isArray(rule)) return false;

  if (rule.$or !== undefined) {
    return Array.isArray(rule.$or) && rule.$or.some((r) => checkRule(r, user, record));
  }
  if (rule.$and !== undefined) {
    return Array.isArray(rule.$and) && rule.$and.every((r) => checkRule(r, user, record));
  }
  if (rule.user_condition !== undefined && rule.user_condition !== null) {
    const cond = rule.user_condition;
    if (cond.role !== undefined) {
      const roles = Array.isArray(cond.role) ? cond.role : [cond.role];
      return roles.includes(user.role) || user.role === 'admin';
    }
    return false; // unknown user_condition shape -> deny
  }

  // data.* leaf conditions (AND-combined within the object)
  let sawCondition = false;
  for (const [key, expected] of Object.entries(rule)) {
    if (!key.startsWith('data.')) return false; // unknown key -> deny
    sawCondition = true;
    const field = key.slice('data.'.length);
    const want = substituteUser(expected, user);
    const got = record ? record[field] : undefined;
    if (Array.isArray(got)) {
      if (!got.map(String).includes(want)) return false;
    } else if (String(got ?? '') !== want) {
      return false;
    }
  }
  return sawCondition;
}

/**
 * Resolve the effective rule for an operation. Entities without an `rls`
 * block default to admin-only (secure default).
 */
export function ruleFor(schema, operation) {
  const rls = schema && schema.rls;
  if (!rls || typeof rls !== 'object') {
    return { user_condition: { role: 'admin' } };
  }
  if (!(operation in rls)) {
    return { user_condition: { role: 'admin' } };
  }
  return rls[operation]; // may be null (public)
}

export function canCreate(schema, user, newRecord) {
  return checkRule(ruleFor(schema, 'create'), user, newRecord);
}
export function canRead(schema, user, record) {
  return checkRule(ruleFor(schema, 'read'), user, record);
}
export function canUpdate(schema, user, record) {
  return checkRule(ruleFor(schema, 'update'), user, record);
}
export function canDelete(schema, user, record) {
  return checkRule(ruleFor(schema, 'delete'), user, record);
}

// ---------------------------------------------------------------------------
// Query filter evaluation (the `filter` query param on list endpoints).
// Filters run in JS over decoded records, after RLS has been applied.
// Supported: $or, $and, $contains, $in, $gte, $lte, $gt, $lt, $ne, $eq,
// plus plain equality.
// ---------------------------------------------------------------------------
function looseEqual(a, b) {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return String(a) === String(b);
}

export function compareValues(a, b) {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn) && String(a).trim() !== '' && String(b).trim() !== '') {
    return an < bn ? -1 : an > bn ? 1 : 0;
  }
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function applyOperator(value, op, operand, flags) {
  switch (op) {
    case '$eq': return looseEqual(value, operand);
    case '$ne': return !looseEqual(value, operand);
    case '$in':
      return Array.isArray(operand) && operand.some((o) => looseEqual(value, o));
    case '$nin':
      return Array.isArray(operand) && !operand.some((o) => looseEqual(value, o));
    case '$contains':
      if (Array.isArray(value)) return value.some((v) => looseEqual(v, operand));
      if (typeof value === 'string') return value.toLowerCase().includes(String(operand).toLowerCase());
      return false;
    case '$exists': {
      const exists = value !== null && value !== undefined;
      return operand ? exists : !exists;
    }
    case '$regex': {
      try {
        const re = new RegExp(String(operand), /i/.test(flags || '') ? 'i' : '');
        return re.test(String(value ?? ''));
      } catch {
        return false;
      }
    }
    case '$gte': return compareValues(value, operand) >= 0;
    case '$lte': return compareValues(value, operand) <= 0;
    case '$gt': return compareValues(value, operand) > 0;
    case '$lt': return compareValues(value, operand) < 0;
    default: return false; // unknown operator -> no match
  }
}

export function matchFilter(record, filter) {
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) return true;
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return Array.isArray(cond) && cond.some((f) => matchFilter(record, f));
    if (key === '$and') return Array.isArray(cond) && cond.every((f) => matchFilter(record, f));
    const value = record[key];
    if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
      // $options is a sibling of $regex (e.g. { $regex: "x", $options: "i" })
      const flags = typeof cond.$options === 'string' ? cond.$options : '';
      return Object.entries(cond).every(([op, operand]) => {
        if (op === '$options') return true;
        return applyOperator(value, op, operand, flags);
      });
    }
    return looseEqual(value, cond); // plain equality
  });
}

/**
 * Parse a sort string like "-created_date,subject" into [{field, dir}].
 */
export function parseSort(sortParam) {
  if (!sortParam) return [];
  return String(sortParam)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('-') ? { field: s.slice(1), dir: -1 } : { field: s, dir: 1 }));
}

export function sortRecords(records, sortParam) {
  const keys = parseSort(sortParam);
  if (!keys.length) return records;
  return [...records].sort((a, b) => {
    for (const { field, dir } of keys) {
      const c = compareValues(a[field], b[field]);
      if (c !== 0) return c * dir;
    }
    return 0;
  });
}
