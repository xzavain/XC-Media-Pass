/**
 * Platform-integration replacements (base44.integrations.Core in the
 * original app), backed by this server's own configuration.
 *
 *   POST /api/integrations/email  {to, subject, body}  (authenticated)
 *        Sends via the operator's SMTP server (lib/mailer.js). When email
 *        is not configured, responds 400 with the reason — callers tally
 *        the failure instead of pretending the message was sent.
 */

import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { sendMail, mailerConfigured } from '../lib/mailer.js';

const router = Router();

router.post('/email', requireAuth, async (req, res) => {
  const { to, subject, body } = req.body || {};
  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject are required' });
  }
  if (!mailerConfigured()) {
    return res.status(400).json({
      ok: false,
      error: 'Email sending is not configured on this server (set SMTP_HOST and related variables to enable it).',
    });
  }
  try {
    await sendMail({ to, subject, body });
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message || 'Email send failed' });
  }
});

export default router;
