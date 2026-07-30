import { Response } from 'express';
import { RequestWithUser } from '../../types';
import pool from '../../db';
import { v4 as uuidv4 } from 'uuid';

function mapUser(r: any) {
  return { id: r.id, name: r.name, email: r.email, role: r.role, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at };
}

export async function list(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY name');
    res.json({ data: rows.map(mapUser), total: rows.length });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function create(req: RequestWithUser, res: Response) {
  try {
    const { name, email, role = 'viewer' } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Missing fields' });
    const id = uuidv4();
    const { rows } = await pool.query('INSERT INTO users (id, name, email, role) VALUES ($1,$2,$3,$4) RETURNING *', [id, name, email, role]);
    res.status(201).json(mapUser(rows[0]));
  } catch (e: any) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getById(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapUser(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function update(req: RequestWithUser, res: Response) {
  try {
    const { name, email, role, status } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (name) { updates.push(`name = $${p++}`); params.push(name); }
    if (email) { updates.push(`email = $${p++}`); params.push(email); }
    if (role) { updates.push(`role = $${p++}`); params.push(role); }
    if (status) { updates.push(`status = $${p++}`); params.push(status); }
    if (!updates.length) return res.status(400).json({ error: 'No fields' });
    updates.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapUser(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}
