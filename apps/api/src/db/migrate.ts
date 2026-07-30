import pool from './index';

export default async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'viewer',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        environment VARCHAR(50) NOT NULL,
        criticality VARCHAR(50) NOT NULL DEFAULT 'medium',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        owner VARCHAR(255),
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS findings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        recommendation TEXT,
        evidence JSONB DEFAULT '{}',
        first_detected_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ DEFAULT NOW(),
        assigned_to VARCHAR(255),
        ticket_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS scans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'queued',
        target VARCHAR(255),
        asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
        progress INTEGER DEFAULT 0,
        findings_count INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS remediations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        finding_id UUID REFERENCES findings(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        assigned_to VARCHAR(255),
        approved_by VARCHAR(255),
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        priority VARCHAR(50) DEFAULT 'medium',
        assigned_to VARCHAR(255),
        created_by VARCHAR(255),
        finding_id UUID REFERENCES findings(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'queued',
        content JSONB,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(255) NOT NULL,
        actor VARCHAR(255),
        details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_findings_asset_id ON findings(asset_id);
      CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
      CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
      CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
      CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
    `);
    console.log(JSON.stringify({ type: 'migrate', status: 'completed' }));
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate().catch(console.error).finally(() => pool.end());
}
