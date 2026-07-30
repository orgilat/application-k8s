import { Response } from 'express';
import { RequestWithUser } from '../../types';
import pool from '../../db';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../activity/service';
import { enqueueJob } from '../../queue';

function mapRem(r: any) {
  return {
    id: r.id, title: r.title, description: r.description,
    findingId: r.finding_id, findingTitle: r.finding_title,
    status: r.status, assignedTo: r.assigned_to, approvedBy: r.approved_by,
    createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

const BASE = `SELECT r.*, f.title as finding_title FROM remediations r LEFT JOIN findings f ON r.finding_id = f.id`;

export async function list(req: RequestWithUser, res: Response) {
  try {
    const { status, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const conditions = status ? [`r.status = '${status}'`] : [];
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const [{ rows }, { rows: count }] = await Promise.all([
      pool.query(`${BASE} ${where} ORDER BY r.created_at DESC LIMIT $1 OFFSET $2`, [parseInt(pageSize), offset]),
      pool.query(`SELECT COUNT(*) FROM remediations r ${where}`),
    ]);
    res.json({ data: rows.map(mapRem), total: parseInt(count[0].count), page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function create(req: RequestWithUser, res: Response) {
  try {
    const { title, description, findingId, assignedTo } = req.body;
    if (!title) return res.status(400).json({ error: 'Missing title' });
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO remediations (id, title, description, finding_id, assigned_to, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, title, description || null, findingId || null, assignedTo || null, req.userId]
    );
    await logActivity('remediation', id, 'created', req.userId, { title });
    res.status(201).json(mapRem(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getById(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`${BASE} WHERE r.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapRem(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function approve(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`UPDATE remediations SET status = 'approved', approved_by = $1, updated_at = NOW() WHERE id = $2 AND status = 'pending' RETURNING *`, [req.userId, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found or not pending' });
    await logActivity('remediation', req.params.id, 'approved', req.userId, {});
    res.json(mapRem(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function reject(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`UPDATE remediations SET status = 'rejected', updated_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING *`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found or not pending' });
    await logActivity('remediation', req.params.id, 'rejected', req.userId, {});
    res.json(mapRem(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function start(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`UPDATE remediations SET status = 'in_progress', updated_at = NOW() WHERE id = $1 AND status = 'approved' RETURNING *`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found or not approved' });
    await enqueueJob('remediation.run', { remediationId: req.params.id });
    await logActivity('remediation', req.params.id, 'started', req.userId, {});
    res.json(mapRem(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function complete(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`UPDATE remediations SET status = 'completed', updated_at = NOW() WHERE id = $1 AND status = 'in_progress' RETURNING *`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found or not in progress' });
    await logActivity('remediation', req.params.id, 'completed', req.userId, {});
    res.json(mapRem(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getActivity(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`SELECT * FROM activity_log WHERE entity_type = 'remediation' AND entity_id = $1 ORDER BY created_at DESC`, [req.params.id]);
    res.json({ data: rows.map((r: any) => ({ id: r.id, action: r.action, actor: r.actor, details: r.details, createdAt: r.created_at })) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}
