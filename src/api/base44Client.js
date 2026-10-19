/**
 * Self-hosted REST shim replacing the Base44 SDK.
 *
 * Same shape the app imports (`import { base44 } from '@/api/base44Client'`),
 * backed by same-origin `fetch` calls against `/api/*`.
 *
 * Session token lives in localStorage under `xcmp_token` and is attached as
 * `Authorization: Bearer <token>` on every API call.
 */

const TOKEN_KEY = 'xcmp_token';

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — auth simply won't persist */
  }
}

/**
 * Error shape mirrors the old SDK: a normal Error with `.status` (HTTP status,
 * 0 on network failure) and `.data` (parsed error body, when available).
 * The app branches on `error.status` (401/403) and `error.message`.
 */
class ApiError extends Error {
  constructor(status, message, data) {
    super(message || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(method, path, body) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, { method, headers, body: payload });
  } catch (networkErr) {
    throw new ApiError(0, networkErr?.message || 'Network request failed');
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      res.statusText ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }
  return data;
}

function queryString(params) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null) continue;
    qs.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------

let cachedUser = null;

function clearAuthState() {
  storeToken(null);
  cachedUser = null;
}

const auth = {
  async loginViaEmailPassword(email, password) {
    const data = await request('POST', '/api/auth/login', { email, password });
    const token = data?.access_token || data?.token || data?.data?.access_token;
    if (token) storeToken(token);
    const user = data?.user || data?.data?.user || data;
    if (user && user.id) cachedUser = user;
    return user;
  },

  async me() {
    try {
      const data = await request('GET', '/api/auth/me');
      // Server wraps the user as { user }; unwrap to match the SDK shape.
      const user = data?.user || data;
      cachedUser = user;
      return user;
    } catch (err) {
      // Expired/invalid token: drop it so the app falls back to signed-out state.
      if (err?.status === 401) clearAuthState();
      throw err;
    }
  },

  async logout(redirectUrl) {
    try {
      await request('POST', '/api/auth/logout');
    } catch {
      /* best effort — still clear local state */
    }
    clearAuthState();
    window.location.href = redirectUrl || '/login';
  },

  async updateMe(patch) {
    const me = cachedUser && cachedUser.id ? cachedUser : await auth.me();
    const updated = await entities.User.update(me.id, patch);
    cachedUser = updated && updated.id ? updated : await auth.me();
    return cachedUser;
  },

  redirectToLogin(url) {
    window.location.href = url || '/login';
  },

  async register({ email, password, ...rest }) {
    const data = await request('POST', '/api/auth/register', {
      email,
      password,
      ...rest,
    });
    const token = data?.access_token || data?.token;
    if (token) storeToken(token);
    return data;
  },

  setToken(token) {
    storeToken(token);
  },

  verifyOtp() {
    return Promise.reject(
      new Error('Email verification is not configured on this self-hosted instance.')
    );
  },

  resendOtp() {
    return Promise.reject(
      new Error('Email verification is not configured on this self-hosted instance.')
    );
  },

  resetPasswordRequest() {
    return Promise.reject(
      new Error('Password reset is not configured on this self-hosted instance.')
    );
  },

  resetPassword() {
    return Promise.reject(
      new Error('Password reset is not configured on this self-hosted instance.')
    );
  },
};

// ---------------------------------------------------------------------------
// entities
// ---------------------------------------------------------------------------

function normalizePage(data) {
  if (Array.isArray(data)) return { items: data, next_cursor: null };
  return {
    items: data?.items || data?.records || data?.rows || [],
    next_cursor: data?.next_cursor ?? data?.cursor ?? null,
  };
}

function makeEntityClient(name) {
  const base = `/api/entities/${encodeURIComponent(name)}`;

  return {
    list(sort, limit, filter) {
      return request('GET', base + queryString({ sort, limit, filter }));
    },

    /**
     * Dual shape (see AUDIT):
     *  - filter(query, sortString?, limit?)            -> Array
     *  - filter(query, { sort, limit, cursor? })       -> { items, next_cursor }
     */
    filter(query, sortOrOpts, limit) {
      if (sortOrOpts && typeof sortOrOpts === 'object' && !Array.isArray(sortOrOpts)) {
        const { sort, limit: optLimit, cursor } = sortOrOpts;
        return request(
          'GET',
          base + queryString({ filter: query, sort, limit: optLimit, cursor })
        ).then(normalizePage);
      }
      return request('GET', base + queryString({ filter: query, sort: sortOrOpts, limit }));
    },

    get(id) {
      return request('GET', `${base}/${encodeURIComponent(id)}`);
    },

    create(data) {
      return request('POST', base, data);
    },

    update(id, data) {
      return request('PUT', `${base}/${encodeURIComponent(id)}`, data);
    },

    delete(id) {
      return request('DELETE', `${base}/${encodeURIComponent(id)}`);
    },

    bulkCreate(records) {
      return request('POST', `${base}/bulk`, records);
    },

    bulkUpdate(records) {
      return request('PUT', `${base}/bulk`, records);
    },

    deleteMany(filter) {
      return request('DELETE', base + queryString({ filter }));
    },

    aggregate({ groupBy, sum } = {}) {
      return request('POST', `${base}/aggregate`, { groupBy, sum });
    },

    subscribe(callback) {
      return subscribeToEntity(name, callback);
    },
  };
}

/**
 * The User entity is special:
 *  - `update` strips `role` from the patch when the acting (cached) user is not
 *    an admin. This neutralizes the login pages' self-promoting
 *    `User.update(me.id, { role: 'admin' })` call (privilege escalation) while
 *    keeping the call itself working. Admins can still set roles; fail closed
 *    when the actor can't be determined.
 *  - `create` is disabled — new users come through the invite flow.
 */
function makeUserClient() {
  const base = makeEntityClient('User');

  return {
    ...base,

    async update(id, patch) {
      const clean = { ...(patch || {}) };
      if (Object.prototype.hasOwnProperty.call(clean, 'role')) {
        let actor = cachedUser;
        if (!actor) {
          try {
            actor = await auth.me();
          } catch {
            actor = null;
          }
        }
        if (!actor || actor.role !== 'admin') {
          delete clean.role;
        }
      }
      return base.update(id, clean);
    },

    create() {
      throw new Error(
        'Creating users directly is not supported on this self-hosted instance — ' +
          'invite them from User Management instead.'
      );
    },
  };
}

const SUBSCRIBE_POLL_MS = 15000;

/**
 * Real-time emulation for `entities.<Name>.subscribe(callback)`.
 * Immediately lists records, then re-lists every 15s and emits synthetic
 * `{ type: 'create' | 'update' | 'delete', data }` events for diffs by id.
 * Returns an unsubscribe function (used as the useEffect cleanup).
 */
function subscribeToEntity(name, callback) {
  const client = entityClient(name);
  let prev = null;
  let stopped = false;

  const poll = async () => {
    if (stopped) return;
    try {
      const result = await client.list();
      const items = Array.isArray(result) ? result : result?.items || [];
      if (prev === null) {
        prev = items;
        return;
      }
      const prevById = new Map(prev.map((r) => [r && r.id, r]));
      const curById = new Map(items.map((r) => [r && r.id, r]));
      for (const [id, rec] of curById) {
        if (!prevById.has(id)) callback({ type: 'create', data: rec });
        else if (JSON.stringify(prevById.get(id)) !== JSON.stringify(rec)) {
          callback({ type: 'update', data: rec });
        }
      }
      for (const [id, rec] of prevById) {
        if (!curById.has(id)) callback({ type: 'delete', data: rec });
      }
      prev = items;
    } catch {
      /* transient failure — keep polling */
    }
  };

  poll();
  const timer = setInterval(poll, SUBSCRIBE_POLL_MS);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

const entityCache = new Map();

function entityClient(name) {
  if (!entityCache.has(name)) {
    entityCache.set(name, name === 'User' ? makeUserClient() : makeEntityClient(name));
  }
  return entityCache.get(name);
}

const entities = new Proxy(
  {},
  {
    get(_target, name) {
      // Never treat promise machinery / symbols as entity names.
      if (typeof name !== 'string' || name === 'then') return undefined;
      return entityClient(name);
    },
  }
);

// ---------------------------------------------------------------------------
// users / functions / integrations
// ---------------------------------------------------------------------------

const users = {
  inviteUser(email, role) {
    return request('POST', '/api/users/invite', { email, role });
  },
};

const functions = {
  invoke(functionName /*, args */) {
    return Promise.reject(
      new Error(
        `Function "${functionName}" is unavailable: Stripe checkout is not configured on this self-hosted instance.`
      )
    );
  },
};

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const comma = dataUrl.indexOf(',');
      // Send raw base64 without the `data:<mime>;base64,` prefix.
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = () => reject(new Error('Could not read file for upload.'));
    reader.readAsDataURL(file);
  });
}

const integrations = {
  Core: {
    /**
     * Best-effort email stub. Never throws — call sites tally results and the
     * app treats a missing mailer as a soft failure.
     */
    SendEmail({ to, subject } = {}) {
      console.warn(
        '[shim] SendEmail skipped — email sending is not configured on this self-hosted instance.',
        { to, subject }
      );
      return Promise.resolve({ ok: false, notice: 'Email sending is not configured' });
    },

    async UploadFile({ file } = {}) {
      if (!file) throw new Error('UploadFile requires a file.');
      const content_base64 = await readFileAsBase64(file);
      const data = await request('POST', '/api/uploads', {
        filename: file.name || 'upload.bin',
        content_base64,
      });
      const file_url = data?.file_url || data?.url;
      if (!file_url) throw new Error('Upload did not return a file URL.');
      return { file_url };
    },
  },
};

export const base44 = {
  auth,
  entities,
  users,
  functions,
  integrations,
};
