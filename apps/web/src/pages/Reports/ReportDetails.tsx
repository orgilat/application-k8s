import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { reportsApi } from '../../api';
import type { Report } from '../../types';

export function ReportDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    reportsApi.get(id).then(async r => {
      setReport(r);
      if (r.status === 'ready') {
        try { const c = await reportsApi.getContent(id); setContent(c.content); } catch {}
      }
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleRegenerate() {
    if (!id) return;
    setRegenerating(true);
    try { setReport(await reportsApi.regenerate(id)); setContent(null); } finally { setRegenerating(false); }
  }

  if (loading) return <><TopBar title="Report" /><LoadingSpinner /></>;
  if (!report) return <><TopBar title="Report" /><div style={{ padding: 24, color: '#94a3b8' }}>Not found</div></>;

  return (
    <div data-testid="report-details-page">
      <TopBar title={report.name} />
      <div style={{ padding: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/reports')} style={{ marginBottom: 16 }}>← Back</Button>
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, border: '1px solid #334155', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 data-testid="report-name" style={{ color: '#f1f5f9', fontSize: 18, marginBottom: 8 }}>{report.name}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <Badge value={report.status} type="status" data-testid="report-status" />
                <span style={{ color: '#94a3b8', fontSize: 13 }}>{report.type.replace(/_/g,' ')}</span>
              </div>
            </div>
            <Button variant="ghost" loading={regenerating} onClick={handleRegenerate} data-testid="regenerate-btn">Regenerate</Button>
          </div>
        </div>
        {content && (
          <div data-testid="report-content" style={{ background: '#1e293b', borderRadius: 10, padding: 20, border: '1px solid #334155' }}>
            <h3 style={{ color: '#f1f5f9', marginBottom: 16 }}>Report Content</h3>
            <pre style={{ color: '#94a3b8', fontSize: 13, overflowX: 'auto' }}>{JSON.stringify(content, null, 2)}</pre>
          </div>
        )}
        {report.status === 'queued' || report.status === 'generating' ? (
          <div data-testid="report-generating" style={{ color: '#94a3b8', padding: 20 }}>Report is being generated…</div>
        ) : null}
      </div>
    </div>
  );
}
