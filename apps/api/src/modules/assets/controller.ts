import { Response } from 'express';
import { RequestWithUser } from '../../types';
import pool from '../../db';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../activity/service';

export async function list(req: RequestWithUser, res: Response) {
  try {
    const { search, type, criticality, status, provider, environment, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (search) { conditions.push(`(name ILIKE $${p} OR owner ILIKE $${p})`); params.push(`%${search}%`); p++; }
    if (type) { conditions.push(`type = $${p++}`); params.push(type); }
    if (criticality) { conditions.push(`criticality = $${p++}`); params.push(criticality); }
    if (status) { conditions.push(`status = $${p++}`); params.push(status); }
    if (provider) { conditions.push(`provider = $${p++}`); params.push(provider); }
    if (environment) { conditions.push(`environment = $${p++}`); params.push(environment); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const [{ rows }, { rows: count }] = await Promise.all([
      pool.query(`SELECT * FROM assets ${where} ORDER BY created_at DESC LIMIT $${p} OFFSET $${p+1}`, [...params, parseInt(pageSize), offset]),
      pool.query(`SELECT COUNT(*) FROM assets ${where}`, params),
    ]);

    res.json({ data: rows.map(mapAsset), total: parseInt(count[0].count), page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function create(req: RequestWithUser, res: Response) {
  try {
    const { name, type, provider, environment, criticality = 'medium', status = 'active', owner, tags = [] } = req.body;
    if (!name || !type || !provider || !environment) return res.status(400).json({ error: 'Missing required fields' });
    const id = uuidv4();
    const { rows } = await pool.query(
      'INSERT INTO assets (id, name, type, provider, environment, criticality, status, owner, tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [id, name, type, provider, environment, criticality, status, owner || null, tags]
    );
    await logActivity('asset', id, 'created', req.userId, { name, type });
    res.status(201).json(mapAsset(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getById(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query('SELECT * FROM assets WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapAsset(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function update(req: RequestWithUser, res: Response) {
  try {
    const fields = ['name', 'type', 'provider', 'environment', 'criticality', 'status', 'owner', 'tags'];
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = $${p++}`); params.push(req.body[f]); }
    }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    updates.push(`updated_at = NOW()`);
    params.push(req.params.id);
    const { rows } = await pool.query(`UPDATE assets SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await logActivity('asset', req.params.id, 'updated', req.userId, req.body);
    res.json(mapAsset(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function remove(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query('DELETE FROM assets WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getFindings(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query('SELECT * FROM findings WHERE asset_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json({ data: rows.map(mapFinding) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getScans(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query('SELECT * FROM scans WHERE asset_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json({ data: rows.map(mapScan) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getActivity(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query("SELECT * FROM activity_log WHERE entity_type = 'asset' AND entity_id = $1 ORDER BY created_at DESC LIMIT 50", [req.params.id]);
    res.json({ data: rows.map(mapActivity) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function updateCriticality(req: RequestWithUser, res: Response) {
  try {
    const { criticality } = req.body;
    if (!criticality) return res.status(400).json({ error: 'Missing criticality' });
    const { rows } = await pool.query('UPDATE assets SET criticality = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [criticality, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await logActivity('asset', req.params.id, 'criticality_updated', req.userId, { criticality });
    res.json(mapAsset(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function updateOwner(req: RequestWithUser, res: Response) {
  try {
    const { owner } = req.body;
    const { rows } = await pool.query('UPDATE assets SET owner = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [owner || null, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await logActivity('asset', req.params.id, 'owner_updated', req.userId, { owner });
    res.json(mapAsset(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function addTag(req: RequestWithUser, res: Response) {
  try {
    const { tag } = req.body;
    if (!tag) return res.status(400).json({ error: 'Missing tag' });
    const { rows } = await pool.query('UPDATE assets SET tags = array_append(tags, $1), updated_at = NOW() WHERE id = $2 RETURNING *', [tag, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapAsset(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function removeTag(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query('UPDATE assets SET tags = array_remove(tags, $1), updated_at = NOW() WHERE id = $2 RETURNING *', [req.params.tag, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapAsset(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

function mapAsset(r: any) {
  return { id: r.id, name: r.name, type: r.type, provider: r.provider, environment: r.environment, criticality: r.criticality, status: r.status, owner: r.owner, tags: r.tags || [], createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapFinding(r: any) {
  return { id: r.id, title: r.title, severity: r.severity, status: r.status, category: r.category, assignedTo: r.assigned_to, createdAt: r.created_at };
}
function mapScan(r: any) {
  return { id: r.id, name: r.name, type: r.type, status: r.status, progress: r.progress, createdAt: r.created_at };
}
function mapActivity(r: any) {
  return { id: r.id, entityType: r.entity_type, entityId: r.entity_id, action: r.action, actor: r.actor, details: r.details, createdAt: r.created_at };
}
