import pool from '../db';
import { log } from '../queue';

const DELAY = parseInt(process.env.WORKER_PROCESSING_DELAY_MS || '2000');
const FAILURE_RATE = parseInt(process.env.WORKER_FAILURE_RATE_PERCENT || '10');

export async function processRemediation(payload: { remediationId: string }) {
  const { remediationId } = payload;
  log('remediation_started', { remediationId });

  await sleep(DELAY);

  if (Math.random() * 100 < FAILURE_RATE) {
    await pool.query(`UPDATE remediations SET status = 'failed', updated_at = NOW() WHERE id = $1`, [remediationId]);
    await logActivity('remediation', remediationId, 'failed', 'worker');
    log('remediation_failed', { remediationId });
    return;
  }

  const { rows } = await pool.query(`UPDATE remediations SET status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING finding_id`, [remediationId]);
  if (rows[0]?.finding_id) {
    await pool.query(`UPDATE findings SET status = 'resolved', updated_at = NOW() WHERE id = $1`, [rows[0].finding_id]);
    await logActivity('finding', rows[0].finding_id, 'resolved', 'worker');
  }
  await logActivity('remediation', remediationId, 'completed', 'worker');
  log('remediation_completed', { remediationId });
}

async function logActivity(entityType: string, entityId: string, action: string, actor: string, details: Record<string, unknown> = {}) {
  try {
    await pool.query('INSERT INTO activity_log (entity_type, entity_id, action, actor, details) VALUES ($1,$2,$3,$4,$5)', [entityType, entityId, action, actor, JSON.stringify(details)]);
  } catch {}
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
