/**
 * Gateway account operations that need provider API access.
 *
 *   POST /api/gateways/:accountId/sync   (admin-only)
 *        Pulls recent payments (and, for Stripe, subscriptions to stage
 *        as migrations) from the provider. Result counts are returned;
 *        the run is also recorded as a SyncLog on the account.
 */

import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { getGatewayAccount, syncGatewayAccount } from '../lib/gateways.js';

const router = Router();

router.post('/:accountId/sync', requireAdmin, async (req, res) => {
  const account = getGatewayAccount(req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Gateway account not found' });
  try {
    const result = await syncGatewayAccount(account, 'manual');
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Sync failed' });
  }
});

export default router;
