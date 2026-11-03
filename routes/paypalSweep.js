/**
 * PayPal Sweep admin API.
 *
 * All endpoints are admin-only. The config endpoint never returns the stored
 * client secret — only whether one is set.
 */

import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import {
  getSweepConfigRow,
  saveSweepConfig,
  publicSweepConfig,
  listSweepRuns,
  runSweep,
  testSweepConnection,
} from '../lib/paypalSweep.js';

const router = Router();
router.use(requireAdmin);

router.get('/config', (req, res) => {
  res.json({ config: publicSweepConfig(getSweepConfigRow()) });
});

router.put('/config', (req, res) => {
  const saved = saveSweepConfig(req.body || {});
  res.json({ config: publicSweepConfig(saved) });
});

router.get('/runs', (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10) || 50;
  res.json({ runs: listSweepRuns(limit) });
});

router.post('/test', async (req, res) => {
  try {
    const result = await testSweepConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

router.post('/run', async (req, res) => {
  try {
    const run = await runSweep('manual');
    res.json({ run });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;
