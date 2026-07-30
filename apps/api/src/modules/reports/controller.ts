import { Response } from 'express';
import { RequestWithUser } from '../../types';
import pool from '../../db';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../activity/service';
import { enqueueJob } from '../../queue';

function mapReport(r: any) {
  return { id: r.id, name: r.name, type: r.type, status: r.status, createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at };
}

export async function list(req: RequestWithUser, res: Response) {
  try {
    const { status, type, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (status) { conditions.push(`status = $${p++}`); params.push(status); }
    if (type) { conditions.push(`type = $${p++}`); params.push(type); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const [{ rows }, { rows: count }] = await Promise.all([
      pool.query(`SELECT * FROM reports ${where} ORDER BY created_at DESC LIMIT $${p} OFFSET $${p+1}`, [...params, parseInt(pageSize), offset]),
      pool.query(`SELECT COUNT(*) FROM reports ${where}`, params),
    ]);
    res.json({ data: rows.map(mapReport), total: parseInt(count[0].count), page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function create(req: RequestWithUser, res: Response) {
  try {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Missing required fields' });
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO reports (id, name, type, status, created_by) VALUES ($1,$2,$3,'queued',$4) RETURNING *`,
      [id, name, type, req.userId]
    );
    await enqueueJob('report.generate', { reportId: id, type, name });
    await logActivity('report', id, 'created', req.userId, { name, type });
    res.status(201).json(mapReport(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getById(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapReport(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getContent(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (rows[0].status !== 'ready') return res.status(400).json({ error: 'Report not ready' });
    res.json({ id: rows[0].id, name: rows[0].name, type: rows[0].type, content: rows[0].content, generatedAt: rows[0].updated_at });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function regenerate(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`UPDATE reports SET status = 'queued', updated_at = NOW() WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await enqueueJob('report.generate', { reportId: req.params.id, type: rows[0].type, name: rows[0].name });
    res.json(mapReport(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}
