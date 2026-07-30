import pool from '../../db';

export async function logActivity(
  entityType: string,
  entityId: string,
  action: string,
  actor: string | undefined,
  details: Record<string, unknown> = {}
) {
  try {
    await pool.query(
      'INSERT INTO activity_log (entity_type, entity_id, action, actor, details) VALUES ($1, $2, $3, $4, $5)',
      [entityType, entityId, action, actor || 'system', JSON.stringify(details)]
    );
  } catch (e) {
    console.error(JSON.stringify({ type: 'activity_log_error', error: (e as Error).message }));
  }
}
