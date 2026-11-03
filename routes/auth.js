/**
 * Auth routes: login / me / logout, plus admin-only user invites.
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb, hashPassword, verifyPassword, randomToken } from '../lib/db.js';
import { requireAdmin } from '../lib/auth.js';
import { sendMail, mailerConfigured } from '../lib/mailer.js';

const router = Router();
// Mounted separately at /api/users (see server.js).
export const inviteRouter = Router();
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function publicUser(u) {
  return { id: u.id, email: u.email, role: u.role, full_name: u.full_name };
}

// POST /api/auth/login {email, password} -> {token, user}
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM "users" WHERE lower("email") = lower(?)').get(String(email).trim());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (user.disabled) {
    return res.status(401).json({ error: 'This account has been disabled' });
  }
  const token = randomToken();
  const now = new Date();
  db.prepare('INSERT INTO "sessions" ("token","user_id","created_at","expires_at") VALUES (?,?,?,?)').run(
    token,
    user.id,
    now.toISOString(),
    new Date(now.getTime() + SESSION_TTL_MS).toISOString()
  );
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me -> current user or 401
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  res.json({ user: req.user });
});

// POST /api/auth/logout -> invalidate the current token
router.post('/logout', (req, res) => {
  if (req.sessionToken) {
    getDb().prepare('DELETE FROM "sessions" WHERE "token" = ?').run(req.sessionToken);
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Password reset (self-hosted replacement for the platform flow).
//
// POST /api/auth/reset-request {email}
//   Always answers {ok:true} so the endpoint can't be used to enumerate
//   accounts. When the account exists, a one-hour token is created and the
//   link is emailed via the configured SMTP server. When email is not
//   configured (or delivery fails), the link is written to the server log
//   instead — the operator who self-hosts can hand it to the user, and the
//   log line says plainly that email was not delivered.
//
// POST /api/auth/reset {token, password}
//   Consumes the token, sets the new password, and signs out all sessions.
// ---------------------------------------------------------------------------
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
let resetsTableReady = false;

function ensureResetsTable() {
  if (resetsTableReady) return;
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS "password_resets" (
      "token_hash" TEXT PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "created_at" TEXT NOT NULL,
      "expires_at" TEXT NOT NULL,
      "used_at" TEXT
    );
  `);
  resetsTableReady = true;
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function requestBaseUrl(req) {
  const configured = String(process.env.APP_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return host ? `${proto}://${host}` : '';
}

router.post('/reset-request', async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim();
  // Generic response regardless of outcome (no account enumeration).
  res.json({ ok: true });
  if (!email || !email.includes('@')) return;
  try {
    ensureResetsTable();
    const db = getDb();
    const user = db.prepare('SELECT * FROM "users" WHERE lower("email") = lower(?)').get(email);
    if (!user || user.disabled) return;
    const token = randomToken(32);
    const now = new Date();
    db.prepare('DELETE FROM "password_resets" WHERE "user_id" = ? AND "used_at" IS NULL').run(user.id);
    db.prepare(
      'INSERT INTO "password_resets" ("token_hash","user_id","created_at","expires_at","used_at") VALUES (?,?,?,?,NULL)'
    ).run(hashResetToken(token), user.id, now.toISOString(), new Date(now.getTime() + RESET_TTL_MS).toISOString());
    const link = `${requestBaseUrl(req)}/reset-password?token=${token}`;
    if (mailerConfigured()) {
      try {
        await sendMail({
          to: user.email,
          subject: 'Reset your XC Media Pass password',
          body: `<p>We received a request to reset the password for your XC Media Pass account.</p><p><a href="${link}">Choose a new password</a></p><p>This link expires in one hour. If you didn't request it, you can ignore this email.</p>`,
        });
        return;
      } catch (err) {
        console.error(`[auth] password reset email to ${user.email} failed (${err.message}). Link: ${link}`);
        return;
      }
    }
    console.log(`[auth] password reset requested for ${user.email}; email is not configured on this server, so the link was not delivered. Link: ${link}`);
  } catch (err) {
    console.error('[auth] reset-request error:', err.message);
  }
});

router.post('/reset', (req, res) => {
  const token = req.body?.token || req.body?.resetToken;
  const password = req.body?.password || req.body?.newPassword;
  if (!token || !password) {
    return res.status(400).json({ error: 'token and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  ensureResetsTable();
  const db = getDb();
  const row = db.prepare('SELECT * FROM "password_resets" WHERE "token_hash" = ?').get(hashResetToken(token));
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' });
  }
  db.prepare('UPDATE "users" SET "password_hash" = ? WHERE "id" = ?').run(hashPassword(password), row.user_id);
  db.prepare('UPDATE "password_resets" SET "used_at" = ? WHERE "token_hash" = ?').run(new Date().toISOString(), row.token_hash);
  db.prepare('DELETE FROM "sessions" WHERE "user_id" = ?').run(row.user_id);
  res.json({ ok: true });
});

// POST /api/users/invite (admin-only) {email, role} -> {invite_url, ...}
inviteRouter.post('/invite', requireAdmin, (req, res) => {
  const { email, role } = req.body || {};
  const cleanEmail = String(email || '').toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  const cleanRole = ['admin', 'staff', 'customer'].includes(role) ? role : 'customer';
  const db = getDb();
  const existing = db.prepare('SELECT "id" FROM "users" WHERE lower("email") = lower(?)').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'A user with that email already exists' });
  }
  // Random temporary password the invitee uses on first login (they should
  // change it immediately afterwards).
  const tempPassword = crypto.randomBytes(9).toString('base64url');
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO "users" ("id","email","password_hash","role","full_name","created_date","disabled") VALUES (?,?,?,?,?,?,0)'
  ).run(id, cleanEmail, hashPassword(tempPassword), cleanRole, null, now);

  const loginPath = `/login?email=${encodeURIComponent(cleanEmail)}&temp=${encodeURIComponent(tempPassword)}`;
  res.status(201).json({
    invite_url: loginPath,
    email: cleanEmail,
    role: cleanRole,
    temp_password: tempPassword,
    message: 'Share the invite_url with the new user. They log in with the temporary password and should change it immediately.',
  });
});

export default router;
