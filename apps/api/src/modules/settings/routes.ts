import { Router } from 'express';
import pool from '../../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const settings: Record<string, unknown> = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/', async (req, res) => {
  try {
    const updates = req.body as Record<string, unknown>;
    for (const [key, value] of Object.entries(updates)) {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
        [key, JSON.stringify(value)]
      );
    }
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const settings: Record<string, unknown> = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
