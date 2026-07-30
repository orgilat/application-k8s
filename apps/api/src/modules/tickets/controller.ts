import { Response } from 'express';
import { RequestWithUser } from '../../types';
import pool from '../../db';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../activity/service';

function mapTicket(r: any) {
  return {
    id: r.id, title: r.title, description: r.description,
    status: r.status, priority: r.priority,
    assignedTo: r.assigned_to, createdBy: r.created_by,
    findingId: r.finding_id, findingTitle: r.finding_title,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

const BASE = `SELECT t.*, f.title as finding_title FROM tickets t LEFT JOIN findings f ON t.finding_id = f.id`;

export async function list(req: RequestWithUser, res: Response) {
  try {
    const { status, priority, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (status) { conditions.push(`t.status = $${p++}`); params.push(status); }
    if (priority) { conditions.push(`t.priority = $${p++}`); params.push(priority); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const [{ rows }, { rows: count }] = await Promise.all([
      pool.query(`${BASE} ${where} ORDER BY t.created_at DESC LIMIT $${p} OFFSET $${p+1}`, [...params, parseInt(pageSize), offset]),
      pool.query(`SELECT COUNT(*) FROM tickets t ${where}`, params),
    ]);
    res.json({ data: rows.map(mapTicket), total: parseInt(count[0].count), page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function create(req: RequestWithUser, res: Response) {
  try {
    const { title, description, priority = 'medium', assignedTo, findingId } = req.body;
    if (!title) return res.status(400).json({ error: 'Missing title' });
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO tickets (id, title, description, priority, assigned_to, created_by, finding_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, title, description || null, priority, assignedTo || null, req.userId, findingId || null]
    );
    if (findingId) {
      await pool.query('UPDATE findings SET ticket_id = $1, updated_at = NOW() WHERE id = $2', [id, findingId]);
    }
    await logActivity('ticket', id, 'created', req.userId, { title });
    res.status(201).json(mapTicket(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getById(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`${BASE} WHERE t.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapTicket(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function update(req: RequestWithUser, res: Response) {
  try {
    const fields = ['title', 'description', 'status', 'priority', 'assigned_to'];
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (const f of fields) {
      const val = req.body[f] ?? req.body[f.replace('_to', 'To')];
      if (val !== undefined) { updates.push(`${f} = $${p++}`); params.push(val); }
    }
    if (!updates.length) return res.status(400).json({ error: 'No fields' });
    updates.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await pool.query(`UPDATE tickets SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await logActivity('ticket', req.params.id, 'updated', req.userId, req.body);
    res.json(mapTicket(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function linkFinding(req: RequestWithUser, res: Response) {
  try {
    const { findingId } = req.body;
    if (!findingId) return res.status(400).json({ error: 'Missing findingId' });
    const { rows } = await pool.query('UPDATE tickets SET finding_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [findingId, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapTicket(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function unlinkFinding(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query('UPDATE tickets SET finding_id = NULL, updated_at = NOW() WHERE id = $1 RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapTicket(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}
