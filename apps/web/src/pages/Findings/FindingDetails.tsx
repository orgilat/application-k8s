import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Tabs } from '../../components/UI/Tabs';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { findingsApi } from '../../api';
import type { Finding, ActivityLog } from '../../types';

export function FindingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([findingsApi.get(id), findingsApi.getActivity(id)])
      .then(([f, a]) => { setFinding(f); setActivity(a.data); })
      .finally(() => setLoading(false));
  }, [id]);

  async function action(name: string, fn: () => Promise<Finding>) {
    setActionLoading(name);
    try { const updated = await fn(); setFinding(updated); } finally { setActionLoading(''); }
  }

  if (loading) return <><TopBar title="Finding Details" /><LoadingSpinner /></>;
  if (!finding) return <><TopBar title="Finding Details" /><div style={{ padding: 24, color: '#94a3b8' }}>Not found</div></>;

  return (
    <div data-testid="finding-details-page">
      <TopBar title="Finding Details" />
      <div style={{ padding: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/findings')} style={{ marginBottom: 16 }}>← Back</Button>

        <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 24, border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 data-testid="finding-title" style={{ color: '#f1f5f9', fontSize: 18, marginBottom: 8 }}>{finding.title}</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge value={finding.severity} type="severity" data-testid="finding-severity" />
                <Badge value={finding.status} type="status" data-testid="finding-status" />
                <span style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#94a3b8' }}>{finding.category.replace(/_/g,' ')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {finding.status === 'open' && (
                <Button size="sm" loading={actionLoading === 'ack'} onClick={() => action('ack', () => findingsApi.acknowledge(id!))} data-testid="acknowledge-btn">Acknowledge</Button>
              )}
              {finding.status === 'open' && (
                <Button size="sm" variant="ghost" loading={actionLoading === 'fp'} onClick={() => action('fp', () => findingsApi.falsePositive(id!))} data-testid="false-positive-btn">False Positive</Button>
              )}
              {(finding.status === 'acknowledged' || finding.status === 'false_positive') && (
                <Button size="sm" variant="secondary" loading={actionLoading === 'reopen'} onClick={() => action('reopen', () => findingsApi.reopen(id!))} data-testid="reopen-btn">Reopen</Button>
              )}
              {finding.status === 'open' && (
                <Button size="sm" variant="danger" loading={actionLoading === 'rem'} onClick={async () => {
                  setActionLoading('rem');
                  try { await findingsApi.startRemediation(id!); const updated = await findingsApi.get(id!); setFinding(updated); } finally { setActionLoading(''); }
                }} data-testid="start-remediation-btn">Start Remediation</Button>
              )}
            </div>
          </div>
        </div>

        <Tabs tabs={[
          { key: 'overview', label: 'Overview', content: <FindingOverview finding={finding} /> },
          { key: 'evidence', label: 'Evidence', content: <pre data-testid="finding-evidence" style={{ color: '#94a3b8', fontSize: 13, background: '#0f172a', padding: 16, borderRadius: 8, overflowX: 'auto' }}>{JSON.stringify(finding.evidence, null, 2)}</pre> },
          { key: 'remediation', label: 'Remediation', content: <div data-testid="finding-recommendation" style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>{finding.recommendation}</div> },
          { key: 'activity', label: 'Activity', content: <div data-testid="finding-activity-list">{activity.map(a => <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #1e293b', fontSize: 13, color: '#94a3b8' }}>{new Date(a.createdAt).toLocaleString()} — {a.action} by {a.actor}</div>)}</div> },
        ]} />
      </div>
    </div>
  );
}

function FindingOverview({ finding }: { finding: Finding }) {
  return (
    <div data-testid="finding-overview" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <InfoRow label="Asset" value={finding.assetName || finding.assetId || '—'} />
      <InfoRow label="Assigned To" value={finding.assignedTo || '—'} />
      <InfoRow label="First Detected" value={new Date(finding.firstDetectedAt).toLocaleString()} />
      <InfoRow label="Last Seen" value={new Date(finding.lastSeenAt).toLocaleString()} />
      <div style={{ gridColumn: 'span 2' }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Description</div>
        <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>{finding.description}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#e2e8f0' }}>{value}</div>
    </div>
  );
}
