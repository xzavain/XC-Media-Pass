/**
 * Auth routes: login / me / logout, plus admin-only user invites.
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb, hashPassword, verifyPassword, randomToken } from '../lib/db.js';
import { requireAdmin } from '../lib/auth.js';

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
