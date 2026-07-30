import { Response } from 'express';
import { RequestWithUser } from '../../types';
import pool from '../../db';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../activity/service';
import { enqueueJob } from '../../queue';

function mapScan(r: any) {
  return {
    id: r.id, name: r.name, type: r.type, status: r.status,
    target: r.target, assetId: r.asset_id, assetName: r.asset_name,
    progress: r.progress, findingsCount: r.findings_count,
    startedAt: r.started_at, completedAt: r.completed_at,
    createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

const BASE = `SELECT s.*, a.name as asset_name FROM scans s LEFT JOIN assets a ON s.asset_id = a.id`;

export async function list(req: RequestWithUser, res: Response) {
  try {
    const { status, type, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (status) { conditions.push(`s.status = $${p++}`); params.push(status); }
    if (type) { conditions.push(`s.type = $${p++}`); params.push(type); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const [{ rows }, { rows: count }] = await Promise.all([
      pool.query(`${BASE} ${where} ORDER BY s.created_at DESC LIMIT $${p} OFFSET $${p+1}`, [...params, parseInt(pageSize), offset]),
      pool.query(`SELECT COUNT(*) FROM scans s ${where}`, params),
    ]);
    res.json({ data: rows.map(mapScan), total: parseInt(count[0].count), page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function create(req: RequestWithUser, res: Response) {
  try {
    const { name, type, target, assetId } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Missing required fields' });
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO scans (id, name, type, status, target, asset_id, created_by) VALUES ($1,$2,$3,'queued',$4,$5,$6) RETURNING *`,
      [id, name, type, target || null, assetId || null, req.userId]
    );
    await enqueueJob('scan.run', { scanId: id, type, target, assetId });
    await logActivity('scan', id, 'created', req.userId, { name, type });
    res.status(201).json(mapScan(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getById(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`${BASE} WHERE s.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapScan(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function cancel(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`UPDATE scans SET status = 'canceled', updated_at = NOW() WHERE id = $1 AND status IN ('queued','running') RETURNING *`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found or not cancelable' });
    await logActivity('scan', req.params.id, 'canceled', req.userId, {});
    res.json(mapScan(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getActivity(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`SELECT * FROM activity_log WHERE entity_type = 'scan' AND entity_id = $1 ORDER BY created_at DESC`, [req.params.id]);
    res.json({ data: rows.map((r: any) => ({ id: r.id, action: r.action, actor: r.actor, details: r.details, createdAt: r.created_at })) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}
