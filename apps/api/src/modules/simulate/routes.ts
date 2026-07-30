import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../activity/service';
import pool from '../../db';

const router = Router();

router.get('/slow', async (req, res) => {
  const ms = parseInt((req.query.ms as string) || '1000');
  await new Promise(r => setTimeout(r, Math.min(ms, 30000)));
  res.json({ delayed: ms });
});

router.get('/error', async (req, res) => {
  const status = parseInt((req.query.status as string) || '500');
  res.status(status).json({ error: `Simulated ${status} error`, status });
});

router.get('/flaky', async (req, res) => {
  const rate = parseInt((req.query.rate as string) || '30');
  if (Math.random() * 100 < rate) {
    return res.status(500).json({ error: 'Simulated flaky failure' });
  }
  res.json({ success: true, rate });
});

router.post('/generate-activity', async (req, res) => {
  try {
    const { rows: assets } = await pool.query('SELECT id FROM assets LIMIT 5');
    const { rows: findings } = await pool.query('SELECT id FROM findings LIMIT 5');
    const actions = ['scanned', 'updated', 'reviewed', 'assigned', 'escalated'];
    const actors = ['alice@exposureops.io', 'bob@exposureops.io', 'system'];
    const generated: string[] = [];
    for (const asset of assets) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      await logActivity('asset', asset.id, action, actors[Math.floor(Math.random() * actors.length)], {});
      generated.push(`asset:${asset.id}:${action}`);
    }
    for (const finding of findings) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      await logActivity('finding', finding.id, action, actors[Math.floor(Math.random() * actors.length)], {});
      generated.push(`finding:${finding.id}:${action}`);
    }
    res.json({ generated: generated.length });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
