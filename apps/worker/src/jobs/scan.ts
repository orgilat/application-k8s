import pool from '../db';
import { log } from '../queue';
import { v4 as uuidv4 } from 'uuid';

const DELAY = parseInt(process.env.WORKER_PROCESSING_DELAY_MS || '2000');
const FAILURE_RATE = parseInt(process.env.WORKER_FAILURE_RATE_PERCENT || '10');
const GENERATE_FINDINGS = process.env.SCAN_FINDINGS_GENERATION_ENABLED === 'true';

export async function processScan(payload: { scanId: string; type: string; target?: string; assetId?: string }) {
  const { scanId, type } = payload;
  log('scan_started', { scanId, type });

  await pool.query(`UPDATE scans SET status = 'running', started_at = NOW(), progress = 10, updated_at = NOW() WHERE id = $1`, [scanId]);
  await logActivity('scan', scanId, 'started', 'worker');

  await sleep(DELAY * 0.3);
  await pool.query(`UPDATE scans SET progress = 40, updated_at = NOW() WHERE id = $1`, [scanId]);

  await sleep(DELAY * 0.3);
  await pool.query(`UPDATE scans SET progress = 70, updated_at = NOW() WHERE id = $1`, [scanId]);

  await sleep(DELAY * 0.4);

  if (Math.random() * 100 < FAILURE_RATE) {
    await pool.query(`UPDATE scans SET status = 'failed', progress = 70, completed_at = NOW(), updated_at = NOW() WHERE id = $1`, [scanId]);
    await logActivity('scan', scanId, 'failed', 'worker');
    log('scan_failed', { scanId });
    return;
  }

  let findingsCount = 0;
  if (GENERATE_FINDINGS && payload.assetId) {
    const categories = ['exposure', 'misconfiguration', 'vulnerability'];
    const severities = ['low', 'medium', 'high'];
    findingsCount = Math.floor(Math.random() * 4);
    for (let i = 0; i < findingsCount; i++) {
      const fid = uuidv4();
      const sev = severities[Math.floor(Math.random() * severities.length)];
      const cat = categories[Math.floor(Math.random() * categories.length)];
      await pool.query(
        `INSERT INTO findings (id, title, severity, asset_id, category, description, recommendation) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [fid, `Scan finding: ${cat} detected`, sev, payload.assetId, cat, `Found during ${type}`, 'Review and remediate']
      );
    }
  }

  await pool.query(
    `UPDATE scans SET status = 'completed', progress = 100, findings_count = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [findingsCount, scanId]
  );
  await logActivity('scan', scanId, 'completed', 'worker', { findingsCount });
  log('scan_completed', { scanId, findingsCount });
}

async function logActivity(entityType: string, entityId: string, action: string, actor: string, details: Record<string, unknown> = {}) {
  try {
    await pool.query('INSERT INTO activity_log (entity_type, entity_id, action, actor, details) VALUES ($1,$2,$3,$4,$5)', [entityType, entityId, action, actor, JSON.stringify(details)]);
  } catch {}
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
