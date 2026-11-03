/**
 * Public media-invite endpoints backing /invite/:token.
 *
 * The Invitation entity's RLS (own-email or admin) is correct for the admin
 * UI, but the invite landing page is visited by people who have no account
 * yet — so token-scoped access lives here instead:
 *
 *   GET  /api/invites/:token            -> public invite details, or a
 *                                        reason (invalid/revoked/expired/used)
 *   POST /api/invites/:token/activate   -> actually creates the account on
 *      {username, email, password}        the target media server, marks
 *                                        the invitation used, and writes
 *                                        the ServerUser + ActivityLog
 *                                        records the admin pages read.
 */

import { Router } from 'express';
import { findRecord, updateRecord, insertRecord } from '../lib/records.js';
import { provisionMediaAccount } from '../lib/mediaProvision.js';

const router = Router();

function inviteState(invitation) {
  if (!invitation) return 'invalid';
  if (invitation.status === 'revoked') return 'revoked';
  if (invitation.status === 'expired') return 'expired';
  if (invitation.expires_at) {
    const t = new Date(invitation.expires_at).getTime();
    if (Number.isFinite(t) && t < Date.now()) return 'expired';
  }
  const maxUses = invitation.max_uses ?? 1;
  if ((invitation.use_count || 0) >= maxUses) return 'used';
  return 'ok';
}

function publicInvite(invitation) {
  return {
    id: invitation.id,
    token: invitation.token,
    server_id: invitation.server_id,
    server_name: invitation.server_name,
    platform: invitation.platform,
    allowed_libraries: invitation.allowed_libraries || [],
    duration_type: invitation.duration_type,
    duration_hours: invitation.duration_hours,
    expires_at: invitation.expires_at,
    status: invitation.status,
    max_uses: invitation.max_uses ?? 1,
    use_count: invitation.use_count || 0,
  };
}

function loadByToken(token) {
  return findRecord('Invitation', (i) => i.token === token);
}

router.get('/:token', (req, res) => {
  const invitation = loadByToken(req.params.token);
  const state = inviteState(invitation);
  if (state === 'invalid') return res.status(404).json({ error: 'invalid' });
  if (state !== 'ok') return res.status(410).json({ error: state });
  res.json({ invitation: publicInvite(invitation) });
});

router.post('/:token/activate', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'A username and password are required.' });
  }
  const invitation = loadByToken(req.params.token);
  const state = inviteState(invitation);
  if (state === 'invalid') return res.status(404).json({ error: 'invalid' });
  if (state !== 'ok') return res.status(410).json({ error: state });

  const server = findRecord('MediaServer', (s) => s.id === invitation.server_id);
  if (!server) {
    return res.status(422).json({ error: 'The media server for this invite is no longer available. Contact the admin for a new link.' });
  }

  let provisioned;
  try {
    provisioned = await provisionMediaAccount(server, {
      username,
      email: email || null,
      password,
      libraries: invitation.allowed_libraries || [],
    });
  } catch (err) {
    // The use is NOT consumed — the invitee can retry, and the admin sees
    // the invitation still pending rather than falsely "active".
    console.error('[invites] provisioning failed:', err.message);
    return res.status(502).json({ error: err.message || 'Account creation failed on the media server.' });
  }

  const now = new Date().toISOString();
  updateRecord('Invitation', invitation.id, {
    username,
    email: email || null,
    status: 'active',
    platform_user_id: provisioned.platform_user_id,
    activated_at: now,
    use_count: (invitation.use_count || 0) + 1,
  });
  try {
    insertRecord('ServerUser', {
      server_id: server.id,
      server_name: server.name,
      platform: server.platform,
      platform_user_id: provisioned.platform_user_id,
      username,
      email: email || null,
      libraries: invitation.allowed_libraries || [],
    });
  } catch (err) {
    console.error('[invites] ServerUser record failed:', err.message);
  }
  try {
    insertRecord('ActivityLog', {
      action: 'invite_activated',
      invitation_id: invitation.id,
      server_id: invitation.server_id,
      username,
      platform: invitation.platform,
      details: `${username} activated invite for ${invitation.server_name}`,
    });
  } catch (err) {
    console.error('[invites] ActivityLog record failed:', err.message);
  }

  res.json({
    ok: true,
    platform: server.platform,
    server_name: server.name,
    server_url: server.platform === 'plex' ? null : server.url,
  });
});

export default router;
