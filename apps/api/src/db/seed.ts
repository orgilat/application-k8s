import pool from './index';
import { v4 as uuidv4 } from 'uuid';

export default async function seed() {
  const client = await pool.connect();
  try {
    const { rows: existing } = await client.query('SELECT COUNT(*) FROM assets');
    if (parseInt(existing[0].count) > 0) {
      console.log(JSON.stringify({ type: 'seed', status: 'skipped' }));
      return;
    }

    const userIds = Array.from({ length: 5 }, () => uuidv4());
    const users = [
      [userIds[0], 'Alice Chen', 'alice@exposureops.io', 'admin'],
      [userIds[1], 'Bob Martinez', 'bob@exposureops.io', 'security_analyst'],
      [userIds[2], 'Carol Smith', 'carol@exposureops.io', 'automation_engineer'],
      [userIds[3], 'David Kim', 'david@exposureops.io', 'security_analyst'],
      [userIds[4], 'Eve Johnson', 'eve@exposureops.io', 'viewer'],
    ];
    for (const u of users) {
      await client.query('INSERT INTO users (id, name, email, role) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', u);
    }

    await client.query(`
      INSERT INTO settings (key, value) VALUES
        ('organization_name', '"ExposureOps Demo"'),
        ('scan_defaults', '{"timeout_minutes": 30, "max_findings": 500}'),
        ('notification_preferences', '{"email": true, "slack": false}'),
        ('risk_thresholds', '{"critical": 90, "high": 70, "medium": 40}')
      ON CONFLICT (key) DO NOTHING
    `);

    const assetData = [
      ['prod-api-server-01', 'server', 'aws', 'prod', 'critical', 'active', 'alice@exposureops.io'],
      ['prod-db-primary', 'database', 'aws', 'prod', 'critical', 'active', 'bob@exposureops.io'],
      ['staging-web-app', 'application', 'azure', 'staging', 'high', 'active', 'carol@exposureops.io'],
      ['dev-redis-cache', 'server', 'gcp', 'dev', 'low', 'active', null],
      ['prod-s3-backups', 'bucket', 'aws', 'prod', 'high', 'active', 'alice@exposureops.io'],
      ['corp-vpn-gateway', 'server', 'on-prem', 'prod', 'critical', 'active', 'david@exposureops.io'],
      ['api.exposureops.io', 'domain', 'aws', 'prod', 'high', 'active', 'alice@exposureops.io'],
      ['10.0.1.45', 'ip', 'on-prem', 'prod', 'medium', 'active', null],
      ['prod-container-registry', 'container', 'azure', 'prod', 'high', 'active', 'carol@exposureops.io'],
      ['staging-postgres-01', 'database', 'gcp', 'staging', 'medium', 'active', 'bob@exposureops.io'],
      ['legacy-ftp-server', 'server', 'on-prem', 'prod', 'critical', 'inactive', 'david@exposureops.io'],
      ['prod-load-balancer', 'server', 'aws', 'prod', 'high', 'active', 'alice@exposureops.io'],
      ['dev-test-bucket', 'bucket', 'gcp', 'dev', 'low', 'active', null],
      ['internal.corp.local', 'domain', 'on-prem', 'prod', 'medium', 'active', 'david@exposureops.io'],
      ['prod-worker-01', 'server', 'aws', 'prod', 'medium', 'active', 'carol@exposureops.io'],
      ['prod-worker-02', 'server', 'aws', 'prod', 'medium', 'active', 'carol@exposureops.io'],
      ['192.168.1.100', 'ip', 'on-prem', 'prod', 'low', 'unknown', null],
      ['prod-kafka-cluster', 'server', 'azure', 'prod', 'high', 'active', 'bob@exposureops.io'],
      ['staging-k8s-node-01', 'container', 'gcp', 'staging', 'medium', 'active', null],
      ['prod-secrets-vault', 'server', 'aws', 'prod', 'critical', 'active', 'alice@exposureops.io'],
    ];

    const assetIds: string[] = [];
    for (const [name, type, provider, env, crit, status, owner] of assetData) {
      const id = uuidv4();
      assetIds.push(id);
      const tags = [env, provider].filter(Boolean);
      await client.query(
        'INSERT INTO assets (id, name, type, provider, environment, criticality, status, owner, tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [id, name, type, provider, env, crit, status, owner, tags]
      );
    }

    const categories = ['exposure', 'misconfiguration', 'vulnerability', 'leaked_secret', 'weak_auth', 'public_access'];
    const severities = ['critical', 'critical', 'high', 'high', 'medium', 'low'];
    const statuses = ['open', 'acknowledged', 'false_positive', 'remediation_pending', 'remediation_in_progress', 'resolved'];
    const findingTitles = [
      'Public S3 bucket exposes sensitive data', 'SSH port exposed to internet', 'Weak TLS configuration on API',
      'Leaked AWS credentials in git history', 'Admin panel accessible without auth', 'Outdated OpenSSL version',
      'Database port exposed publicly', 'Default credentials on FTP server', 'Unrestricted CORS policy',
      'Missing MFA on admin accounts', 'Overly permissive IAM role', 'Unencrypted backup bucket',
      'API key in environment variable', 'Log4Shell vulnerability detected', 'RDP exposed to internet',
      'Insecure cookie configuration', 'SQL injection in search endpoint', 'Outdated nginx version',
      'Missing security headers', 'Excessive S3 bucket permissions', 'Plaintext password in config',
      'Unused admin account with high privileges', 'Container running as root', 'Exposed debug endpoints',
      'Certificate expiring in 7 days', 'Unauthenticated Redis instance', 'Cross-site scripting in user input',
      'Unpatched CVE-2023-44487 (HTTP/2 Rapid Reset)', 'API rate limiting disabled', 'SSRF vulnerability',
      'Path traversal in file upload', 'Reflected XSS in error messages', 'Missing input validation',
      'Expired SSL certificate', 'Hardcoded API key in source code', 'Publicly exposed Kubernetes dashboard',
      'Sensitive data in URL parameters', 'Insecure direct object reference', 'Missing CSRF protection',
      'Open redirect vulnerability', 'DNS zone transfer enabled', 'Weak password policy',
      'Ghost user with admin rights', 'Outdated dependency with known CVE', 'Unprotected .env file',
      'Kibana exposed without authentication', 'Jenkins without auth', 'Exposed Prometheus endpoint',
      'Insecure deserialization', 'Memory disclosure vulnerability',
    ];

    const findingIds: string[] = [];
    for (let i = 0; i < findingTitles.length; i++) {
      const id = uuidv4();
      findingIds.push(id);
      const assetId = assetIds[i % assetIds.length];
      const severity = severities[i % severities.length];
      const status = i < 30 ? 'open' : statuses[i % statuses.length];
      const category = categories[i % categories.length];
      await client.query(
        `INSERT INTO findings (id, title, severity, status, asset_id, category, description, recommendation, evidence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id, findingTitles[i], severity, status, assetId, category,
          `Detected ${category} issue: ${findingTitles[i].toLowerCase()}.`,
          `Remediate by addressing the ${category} configuration immediately.`,
          JSON.stringify({ port: 22 + i, protocol: i % 2 === 0 ? 'tcp' : 'udp', evidence_type: category })
        ]
      );
      await client.query(
        `INSERT INTO activity_log (entity_type, entity_id, action, actor, details) VALUES ('finding', $1, 'created', $2, $3)`,
        [id, 'system', JSON.stringify({ severity, category })]
      );
    }

    const scanTypes = ['vulnerability_scan', 'exposure_scan', 'asset_discovery', 'compliance_scan'];
    const scanStatuses = ['completed', 'completed', 'completed', 'failed', 'running', 'queued'];
    for (let i = 0; i < 10; i++) {
      const id = uuidv4();
      const scanType = scanTypes[i % scanTypes.length];
      const scanStatus = scanStatuses[i % scanStatuses.length];
      const assetId = i < 8 ? assetIds[i] : null;
      await client.query(
        `INSERT INTO scans (id, name, type, status, target, asset_id, progress, findings_count, started_at, completed_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()-interval '${i+1} hours',${scanStatus === 'completed' || scanStatus === 'failed' ? `NOW()-interval '${i} hours'` : 'NULL'},$9)`,
        [id, `${scanType.replace('_', ' ')} #${i+1}`, scanType, scanStatus, `target-${i+1}.corp`, assetId,
         scanStatus === 'completed' ? 100 : scanStatus === 'running' ? 45 + i * 5 : 0,
         scanStatus === 'completed' ? 3 + i : 0, 'alice@exposureops.io']
      );
    }

    for (let i = 0; i < 5; i++) {
      const id = uuidv4();
      const rStatuses = ['pending', 'approved', 'in_progress', 'completed', 'rejected'];
      await client.query(
        `INSERT INTO remediations (id, title, description, finding_id, status, assigned_to, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, `Remediate: ${findingTitles[i]}`, 'Apply recommended security fix', findingIds[i],
         rStatuses[i], userIds[i % userIds.length], 'alice@exposureops.io']
      );
    }

    for (let i = 0; i < 8; i++) {
      const id = uuidv4();
      const tStatuses = ['open', 'in_progress', 'blocked', 'done'];
      const priorities = ['critical', 'high', 'medium', 'low'];
      await client.query(
        `INSERT INTO tickets (id, title, description, status, priority, assigned_to, created_by, finding_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, `[SEC-${100+i}] ${findingTitles[i+5]}`, 'Track remediation progress for security finding',
         tStatuses[i % tStatuses.length], priorities[i % priorities.length],
         userIds[i % userIds.length], 'bob@exposureops.io', findingIds[i+5]]
      );
    }

    const reportTypes = ['executive_summary', 'critical_findings', 'asset_inventory', 'remediation_status'];
    for (let i = 0; i < 3; i++) {
      const id = uuidv4();
      const rType = reportTypes[i % reportTypes.length];
      await client.query(
        `INSERT INTO reports (id, name, type, status, content, created_by) VALUES ($1,$2,$3,'ready',$4,$5)`,
        [id, `${rType.replace('_', ' ')} - Q4 2024`, rType,
         JSON.stringify({ generated_at: new Date().toISOString(), summary: `Auto-generated ${rType} report`, total_items: 50 + i * 10 }),
         'alice@exposureops.io']
      );
    }

    console.log(JSON.stringify({ type: 'seed', status: 'completed', assets: assetData.length, findings: findingTitles.length }));
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed().catch(console.error).finally(() => pool.end());
}
