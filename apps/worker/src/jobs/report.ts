import pool from '../db';
import { log } from '../queue';

const DELAY = parseInt(process.env.WORKER_PROCESSING_DELAY_MS || '2000');
const FAILURE_RATE = parseInt(process.env.WORKER_FAILURE_RATE_PERCENT || '10');

export async function processReport(payload: { reportId: string; type: string; name: string }) {
  const { reportId, type, name } = payload;
  log('report_generating', { reportId, type });

  await pool.query(`UPDATE reports SET status = 'generating', updated_at = NOW() WHERE id = $1`, [reportId]);

  await sleep(DELAY * 1.5);

  if (Math.random() * 100 < FAILURE_RATE) {
    await pool.query(`UPDATE reports SET status = 'failed', updated_at = NOW() WHERE id = $1`, [reportId]);
    await logActivity('report', reportId, 'generation_failed', 'worker');
    log('report_failed', { reportId });
    return;
  }

  const content = await generateContent(type);
  await pool.query(`UPDATE reports SET status = 'ready', content = $1, updated_at = NOW() WHERE id = $2`, [JSON.stringify(content), reportId]);
  await logActivity('report', reportId, 'generated', 'worker', { type });
  log('report_ready', { reportId, type });
}

async function generateContent(type: string): Promise<Record<string, unknown>> {
  const [assets, findings, scans] = await Promise.all([
    pool.query('SELECT COUNT(*), criticality FROM assets GROUP BY criticality'),
    pool.query('SELECT COUNT(*), severity, status FROM findings GROUP BY severity, status'),
    pool.query("SELECT COUNT(*) FROM scans WHERE status = 'completed'"),
  ]);

  const base = {
    generated_at: new Date().toISOString(),
    report_type: type,
    assets_by_criticality: assets.rows,
    findings_summary: findings.rows,
    completed_scans: parseInt(scans.rows[0]?.count || '0'),
  };

  if (type === 'executive_summary') {
    return { ...base, title: 'Executive Security Summary', key_risks: ['Critical exposures detected', 'Remediation velocity at 70%'], score: 62 };
  }
  if (type === 'critical_findings') {
    const { rows } = await pool.query("SELECT title, asset_id, category FROM findings WHERE severity = 'critical' LIMIT 20");
    return { ...base, title: 'Critical Findings Report', critical_findings: rows };
  }
  if (type === 'asset_inventory') {
    const { rows } = await pool.query('SELECT name, type, provider, criticality, status FROM assets LIMIT 100');
    return { ...base, title: 'Asset Inventory Report', assets: rows };
  }
  return { ...base, title: 'Remediation Status Report' };
}

async function logActivity(entityType: string, entityId: string, action: string, actor: string, details: Record<string, unknown> = {}) {
  try {
    await pool.query('INSERT INTO activity_log (entity_type, entity_id, action, actor, details) VALUES ($1,$2,$3,$4,$5)', [entityType, entityId, action, actor, JSON.stringify(details)]);
  } catch {}
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
