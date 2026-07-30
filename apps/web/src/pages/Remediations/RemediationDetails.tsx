import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { remediationsApi } from '../../api';
import type { Remediation } from '../../types';

export function RemediationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Remediation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (!id) return;
    remediationsApi.get(id).then(setItem).finally(() => setLoading(false));
  }, [id]);

  async function action(name: string, fn: () => Promise<Remediation>) {
    setActionLoading(name);
    try { setItem(await fn()); } finally { setActionLoading(''); }
  }

  if (loading) return <><TopBar title="Remediation" /><LoadingSpinner /></>;
  if (!item) return <><TopBar title="Remediation" /><div style={{ padding: 24, color: '#94a3b8' }}>Not found</div></>;

  return (
    <div data-testid="remediation-details-page">
      <TopBar title="Remediation Details" />
      <div style={{ padding: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/remediations')} style={{ marginBottom: 16 }}>← Back</Button>
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, border: '1px solid #334155', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 data-testid="remediation-title" style={{ color: '#f1f5f9', fontSize: 18, marginBottom: 8 }}>{item.title}</h2>
              <Badge value={item.status} type="status" data-testid="remediation-status" />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {item.status === 'pending' && <Button size="sm" loading={actionLoading === 'approve'} onClick={() => action('approve', () => remediationsApi.approve(id!))} data-testid="approve-btn">Approve</Button>}
              {item.status === 'pending' && <Button size="sm" variant="danger" loading={actionLoading === 'reject'} onClick={() => action('reject', () => remediationsApi.reject(id!))} data-testid="reject-btn">Reject</Button>}
              {item.status === 'approved' && <Button size="sm" loading={actionLoading === 'start'} onClick={() => action('start', () => remediationsApi.start(id!))} data-testid="start-btn">Start</Button>}
              {item.status === 'in_progress' && <Button size="sm" variant="secondary" loading={actionLoading === 'complete'} onClick={() => action('complete', () => remediationsApi.complete(id!))} data-testid="complete-btn">Complete</Button>}
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Finding" value={item.findingTitle || '—'} />
            <Field label="Assigned To" value={item.assignedTo || '—'} />
            <Field label="Approved By" value={item.approvedBy || '—'} />
            <Field label="Created By" value={item.createdBy || '—'} />
            {item.description && <div style={{ gridColumn: 'span 2' }}><Field label="Description" value={item.description} /></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#e2e8f0' }}>{value}</div>
    </div>
  );
}
