import { Router } from 'express';
import pool from '../../db';

const router = Router();

router.get('/summary', async (req, res) => {
  try {
    const [assets, critFindings, openFindings, scansRunning, remPending] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM assets'),
      pool.query("SELECT COUNT(*) FROM findings WHERE severity = 'critical' AND status NOT IN ('resolved','false_positive')"),
      pool.query("SELECT COUNT(*) FROM findings WHERE status NOT IN ('resolved','false_positive')"),
      pool.query("SELECT COUNT(*) FROM scans WHERE status = 'running'"),
      pool.query("SELECT COUNT(*) FROM remediations WHERE status IN ('pending','approved')"),
    ]);
    res.json({
      totalAssets: parseInt(assets.rows[0].count),
      criticalFindings: parseInt(critFindings.rows[0].count),
      openFindings: parseInt(openFindings.rows[0].count),
      scansRunning: parseInt(scansRunning.rows[0].count),
      remediationsPending: parseInt(remPending.rows[0].count),
    });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/risk-trend', async (req, res) => {
  try {
    const data = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      critical: Math.floor(Math.random() * 10) + 15,
      high: Math.floor(Math.random() * 15) + 20,
      medium: Math.floor(Math.random() * 20) + 30,
    }));
    res.json({ data });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/recent-activity', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 20');
    res.json({ data: rows.map((r: any) => ({ id: r.id, entityType: r.entity_type, entityId: r.entity_id, action: r.action, actor: r.actor, details: r.details, createdAt: r.created_at })) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/top-risky-assets', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.name, a.criticality, a.type,
        COUNT(f.id) FILTER (WHERE f.severity = 'critical') as critical_count,
        COUNT(f.id) FILTER (WHERE f.severity = 'high') as high_count,
        COUNT(f.id) as total_findings
      FROM assets a
      LEFT JOIN findings f ON a.id = f.asset_id AND f.status NOT IN ('resolved','false_positive')
      WHERE a.status = 'active'
      GROUP BY a.id, a.name, a.criticality, a.type
      ORDER BY critical_count DESC, high_count DESC
      LIMIT 5
    `);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
