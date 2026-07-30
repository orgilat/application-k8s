import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { scansApi } from '../../api';
import type { Scan, ActivityLog } from '../../types';

export function ScanDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scan, setScan] = useState<Scan | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([scansApi.get(id), scansApi.getActivity(id)])
      .then(([s, a]) => { setScan(s); setActivity(a.data); })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    if (!id) return;
    setCanceling(true);
    try { const updated = await scansApi.cancel(id); setScan(updated); } finally { setCanceling(false); }
  }

  if (loading) return <><TopBar title="Scan Details" /><LoadingSpinner /></>;
  if (!scan) return <><TopBar title="Scan Details" /><div style={{ padding: 24, color: '#94a3b8' }}>Not found</div></>;

  return (
    <div data-testid="scan-details-page">
      <TopBar title={scan.name} />
      <div style={{ padding: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/scans')} style={{ marginBottom: 16 }}>← Back</Button>
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, border: '1px solid #334155', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Badge value={scan.status} type="status" data-testid="scan-status" />
              <Badge value={scan.type.replace(/_/g,' ')} />
            </div>
            {(scan.status === 'queued' || scan.status === 'running') && (
              <Button variant="danger" size="sm" loading={canceling} onClick={handleCancel} data-testid="cancel-scan-btn">Cancel</Button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            <Field label="Target" value={scan.target || '—'} />
            <Field label="Findings" value={String(scan.findingsCount)} />
            <Field label="Started" value={scan.startedAt ? new Date(scan.startedAt).toLocaleString() : '—'} />
            <Field label="Completed" value={scan.completedAt ? new Date(scan.completedAt).toLocaleString() : '—'} />
            <Field label="Created By" value={scan.createdBy || '—'} />
          </div>
          {scan.status === 'running' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Progress</div>
              <div style={{ background: '#0f172a', borderRadius: 4, height: 8 }}>
                <div style={{ width: `${scan.progress}%`, height: '100%', background: '#2563eb', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{scan.progress}%</div>
            </div>
          )}
        </div>
        <h3 style={{ color: '#f1f5f9', marginBottom: 12 }}>Activity</h3>
        <div data-testid="scan-activity">
          {activity.map(a => (
            <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #1e293b', fontSize: 13, color: '#94a3b8' }}>
              {new Date(a.createdAt).toLocaleString()} — {a.action} by {a.actor}
            </div>
          ))}
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
