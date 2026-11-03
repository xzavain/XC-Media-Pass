/**
 * Backend "functions" invoked by the frontend shim
 * (base44.functions.invoke in the original app), plus provider webhooks.
 *
 *   POST /api/functions/createCheckoutSession  {priceId, successUrl, cancelUrl}
 *        -> {id, url}   (Stripe Checkout, using the configured gateway account)
 *   POST /api/functions/stripeWebhook?accountId=<id>   (raw body, signed)
 *   POST /api/functions/paypalWebhook?accountId=<id>   (verified via PayPal)
 *
 * Webhook routes are mounted with a raw body parser in server.js (Stripe
 * signature verification needs the exact bytes).
 */

import { Router } from 'express';
import {
  createCheckoutSession,
  getGatewayAccount,
  verifyStripeSignature,
  handleStripeEvent,
  verifyPaypalWebhook,
  handlePaypalEvent,
} from '../lib/gateways.js';

const router = Router();

router.post('/createCheckoutSession', async (req, res) => {
  try {
    const session = await createCheckoutSession(req.body || {});
    res.json(session);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Checkout failed' });
  }
});

router.post('/stripeWebhook', async (req, res) => {
  const account = getGatewayAccount(req.query.accountId);
  if (!account || account.provider !== 'stripe') {
    return res.status(404).json({ error: 'Unknown Stripe gateway account' });
  }
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  try {
    verifyStripeSignature(account, rawBody, req.headers['stripe-signature']);
  } catch (err) {
    console.error('[stripeWebhook]', err.message);
    return res.status(err.status || 400).json({ error: err.message });
  }
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  try {
    handleStripeEvent(event);
  } catch (err) {
    console.error('[stripeWebhook] handler error:', err.message);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
  res.json({ received: true });
});

router.post('/paypalWebhook', async (req, res) => {
  const account = getGatewayAccount(req.query.accountId);
  if (!account || account.provider !== 'paypal') {
    return res.status(404).json({ error: 'Unknown PayPal gateway account' });
  }
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  try {
    await verifyPaypalWebhook(account, req.headers, event);
  } catch (err) {
    console.error('[paypalWebhook]', err.message);
    return res.status(err.status || 400).json({ error: err.message });
  }
  try {
    handlePaypalEvent(event);
  } catch (err) {
    console.error('[paypalWebhook] handler error:', err.message);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
  res.json({ received: true });
});

// Anything else under /api/functions is an honest 404 (the shim surfaces it).
router.use((req, res) => {
  res.status(404).json({ error: `Unknown function: ${req.path.replace(/^\//, '')}` });
});

export default router;
