import { Response } from 'express';
import { RequestWithUser } from '../../types';
import pool from '../../db';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../activity/service';

function mapFinding(r: any) {
  return {
    id: r.id, title: r.title, severity: r.severity, status: r.status,
    assetId: r.asset_id, assetName: r.asset_name, category: r.category,
    description: r.description, recommendation: r.recommendation, evidence: r.evidence || {},
    firstDetectedAt: r.first_detected_at, lastSeenAt: r.last_seen_at,
    assignedTo: r.assigned_to, ticketId: r.ticket_id, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

const BASE_QUERY = `SELECT f.*, a.name as asset_name FROM findings f LEFT JOIN assets a ON f.asset_id = a.id`;

export async function list(req: RequestWithUser, res: Response) {
  try {
    const { search, severity, status, category, assignedTo, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (search) { conditions.push(`f.title ILIKE $${p}`); params.push(`%${search}%`); p++; }
    if (severity) { conditions.push(`f.severity = $${p++}`); params.push(severity); }
    if (status) { conditions.push(`f.status = $${p++}`); params.push(status); }
    if (category) { conditions.push(`f.category = $${p++}`); params.push(category); }
    if (assignedTo) { conditions.push(`f.assigned_to = $${p++}`); params.push(assignedTo); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const [{ rows }, { rows: count }] = await Promise.all([
      pool.query(`${BASE_QUERY} ${where} ORDER BY f.created_at DESC LIMIT $${p} OFFSET $${p+1}`, [...params, parseInt(pageSize), offset]),
      pool.query(`SELECT COUNT(*) FROM findings f ${where}`, params),
    ]);
    res.json({ data: rows.map(mapFinding), total: parseInt(count[0].count), page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function create(req: RequestWithUser, res: Response) {
  try {
    const { title, severity, assetId, category, description = '', recommendation = '', evidence = {} } = req.body;
    if (!title || !severity || !category) return res.status(400).json({ error: 'Missing required fields' });
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO findings (id, title, severity, asset_id, category, description, recommendation, evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, title, severity, assetId || null, category, description, recommendation, JSON.stringify(evidence)]
    );
    await logActivity('finding', id, 'created', req.userId, { severity, category });
    res.status(201).json(mapFinding(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getById(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`${BASE_QUERY} WHERE f.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapFinding(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function update(req: RequestWithUser, res: Response) {
  try {
    const fields = ['title', 'severity', 'status', 'category', 'description', 'recommendation', 'assigned_to'];
    const updates: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (const f of fields) {
      const key = f.replace('_', '');
      const val = req.body[f] ?? req.body[f.replace('_to', 'To')];
      if (val !== undefined) { updates.push(`${f} = $${p++}`); params.push(val); }
    }
    if (!updates.length) return res.status(400).json({ error: 'No fields' });
    updates.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await pool.query(`UPDATE findings SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapFinding(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function acknowledge(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`UPDATE findings SET status = 'acknowledged', updated_at = NOW() WHERE id = $1 AND status = 'open' RETURNING *`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found or not in open state' });
    await logActivity('finding', req.params.id, 'acknowledged', req.userId, {});
    res.json(mapFinding(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function falsePositive(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`UPDATE findings SET status = 'false_positive', updated_at = NOW() WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await logActivity('finding', req.params.id, 'marked_false_positive', req.userId, {});
    res.json(mapFinding(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function reopen(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`UPDATE findings SET status = 'open', updated_at = NOW() WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await logActivity('finding', req.params.id, 'reopened', req.userId, {});
    res.json(mapFinding(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function startRemediation(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`SELECT * FROM findings WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const remId = uuidv4();
    const finding = rows[0];
    await pool.query(
      `INSERT INTO remediations (id, title, finding_id, status, created_by) VALUES ($1,$2,$3,'pending',$4)`,
      [remId, `Remediate: ${finding.title}`, finding.id, req.userId]
    );
    await pool.query(`UPDATE findings SET status = 'remediation_pending', updated_at = NOW() WHERE id = $1`, [req.params.id]);
    await logActivity('finding', req.params.id, 'remediation_started', req.userId, { remediationId: remId });
    res.json({ remediationId: remId });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function linkTicket(req: RequestWithUser, res: Response) {
  try {
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ error: 'Missing ticketId' });
    const { rows } = await pool.query(`UPDATE findings SET ticket_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [ticketId, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(mapFinding(rows[0]));
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function getActivity(req: RequestWithUser, res: Response) {
  try {
    const { rows } = await pool.query(`SELECT * FROM activity_log WHERE entity_type = 'finding' AND entity_id = $1 ORDER BY created_at DESC LIMIT 50`, [req.params.id]);
    res.json({ data: rows.map((r: any) => ({ id: r.id, entityType: r.entity_type, entityId: r.entity_id, action: r.action, actor: r.actor, details: r.details, createdAt: r.created_at })) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function bulkAcknowledge(req: RequestWithUser, res: Response) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Missing ids' });
    await pool.query(`UPDATE findings SET status = 'acknowledged', updated_at = NOW() WHERE id = ANY($1::uuid[]) AND status = 'open'`, [ids]);
    res.json({ updated: ids.length });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function bulkFalsePositive(req: RequestWithUser, res: Response) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Missing ids' });
    await pool.query(`UPDATE findings SET status = 'false_positive', updated_at = NOW() WHERE id = ANY($1::uuid[])`, [ids]);
    res.json({ updated: ids.length });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}

export async function bulkAssignOwner(req: RequestWithUser, res: Response) {
  try {
    const { ids, assignedTo } = req.body;
    if (!Array.isArray(ids) || !ids.length || !assignedTo) return res.status(400).json({ error: 'Missing fields' });
    await pool.query(`UPDATE findings SET assigned_to = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])`, [assignedTo, ids]);
    res.json({ updated: ids.length });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
}
