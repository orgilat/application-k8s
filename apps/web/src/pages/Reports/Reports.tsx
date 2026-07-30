import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Table, Pagination } from '../../components/UI/Table';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { Input, Select, FormField } from '../../components/UI/Input';
import { Modal } from '../../components/UI/Modal';
import { LoadingSpinner, EmptyState } from '../../components/UI/LoadingSpinner';
import { reportsApi } from '../../api';
import type { Report } from '../../types';

export function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'executive_summary' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.list({ page: String(page), pageSize: '20' });
      setReports(res.data); setTotal(res.total);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.name) return;
    setSaving(true);
    try {
      await reportsApi.create(form);
      setShowCreate(false);
      setForm({ name: '', type: 'executive_summary' });
      load();
    } finally { setSaving(false); }
  }

  const columns = [
    { key: 'name', title: 'Name', render: (_: unknown, r: Report) => <span style={{ color: '#60a5fa' }}>{r.name}</span> },
    { key: 'type', title: 'Type', render: (v: unknown) => <span style={{ color: '#94a3b8' }}>{String(v).replace(/_/g,' ')}</span> },
    { key: 'status', title: 'Status', render: (v: unknown) => <Badge value={String(v)} type="status" /> },
    { key: 'createdBy', title: 'Created By', render: (v: unknown) => <span style={{ color: '#64748b' }}>{String(v || '—')}</span> },
    { key: 'createdAt', title: 'Created', render: (v: unknown) => <span style={{ color: '#64748b', fontSize: 12 }}>{new Date(String(v)).toLocaleString()}</span> },
  ];

  return (
    <div data-testid="reports-page">
      <TopBar title="Reports" />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', marginBottom: 20 }}>
          <Button data-testid="generate-report-btn" onClick={() => setShowCreate(true)} style={{ marginLeft: 'auto' }}>+ Generate Report</Button>
        </div>
        {loading ? <LoadingSpinner /> : reports.length === 0 ? <EmptyState title="No reports" /> : (
          <>
            <Table columns={columns as any} data={reports as any} rowKey={r => r.id} onRowClick={r => navigate(`/reports/${r.id}`)} data-testid="reports-table" />
            <Pagination page={page} pageSize={20} total={total} onChange={setPage} />
          </>
        )}
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Generate Report"
        footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button loading={saving} onClick={handleCreate} data-testid="submit-generate-report">Generate</Button></>}
      >
        <FormField label="Report Name"><Input data-testid="report-name-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
        <FormField label="Type"><Select data-testid="report-type-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {['executive_summary','critical_findings','asset_inventory','remediation_status'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
        </Select></FormField>
      </Modal>
    </div>
  );
}
