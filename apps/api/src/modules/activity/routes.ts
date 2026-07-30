import { Router } from 'express';
import pool from '../../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { entity_type, page = '1', pageSize = '50' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const conditions = entity_type ? `WHERE entity_type = '${entity_type}'` : '';
    const [{ rows }, { rows: count }] = await Promise.all([
      pool.query(`SELECT * FROM activity_log ${conditions} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [parseInt(pageSize), offset]),
      pool.query(`SELECT COUNT(*) FROM activity_log ${conditions}`),
    ]);
    res.json({ data: rows.map(mapActivity), total: parseInt(count[0].count), page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

function mapActivity(r: any) {
  return { id: r.id, entityType: r.entity_type, entityId: r.entity_id, action: r.action, actor: r.actor, details: r.details, createdAt: r.created_at };
}

export default router;
