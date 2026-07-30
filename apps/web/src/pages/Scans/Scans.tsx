import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Table, Pagination } from '../../components/UI/Table';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { Input, Select, FormField } from '../../components/UI/Input';
import { Modal } from '../../components/UI/Modal';
import { LoadingSpinner, EmptyState } from '../../components/UI/LoadingSpinner';
import { scansApi } from '../../api';
import type { Scan } from '../../types';

export function Scans() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<Scan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'vulnerability_scan', target: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: '20' };
      if (filterStatus) params.status = filterStatus;
      const res = await scansApi.list(params);
      setScans(res.data); setTotal(res.total);
    } finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.name) return;
    setSaving(true);
    try {
      await scansApi.create(form);
      setShowCreate(false);
      setForm({ name: '', type: 'vulnerability_scan', target: '' });
      load();
    } finally { setSaving(false); }
  }

  const columns = [
    { key: 'name', title: 'Name', render: (_: unknown, r: Scan) => <span style={{ color: '#60a5fa' }}>{r.name}</span> },
    { key: 'type', title: 'Type', render: (v: unknown) => <span style={{ color: '#94a3b8' }}>{String(v).replace(/_/g,' ')}</span> },
    { key: 'status', title: 'Status', render: (v: unknown) => <Badge value={String(v)} type="status" /> },
    { key: 'progress', title: 'Progress', render: (v: unknown, r: Scan) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 80, height: 6, background: '#1e293b', borderRadius: 3 }}>
          <div style={{ width: `${r.progress}%`, height: '100%', background: '#2563eb', borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 12, color: '#64748b' }}>{r.progress}%</span>
      </div>
    )},
    { key: 'findingsCount', title: 'Findings' },
    { key: 'createdAt', title: 'Created', render: (v: unknown) => <span style={{ color: '#64748b', fontSize: 12 }}>{new Date(String(v)).toLocaleString()}</span> },
  ];

  return (
    <div data-testid="scans-page">
      <TopBar title="Scans" />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <Select data-testid="filter-status" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ maxWidth: 180 }}>
            <option value="">All Statuses</option>
            {['queued','running','completed','failed','canceled'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Button data-testid="new-scan-btn" onClick={() => setShowCreate(true)} style={{ marginLeft: 'auto' }}>+ New Scan</Button>
        </div>

        {loading ? <LoadingSpinner /> : scans.length === 0 ? <EmptyState title="No scans" /> : (
          <>
            <Table columns={columns as any} data={scans as any} rowKey={r => r.id} onRowClick={r => navigate(`/scans/${r.id}`)} data-testid="scans-table" />
            <Pagination page={page} pageSize={20} total={total} onChange={setPage} />
          </>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Scan"
        footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button loading={saving} onClick={handleCreate} data-testid="submit-new-scan">Start Scan</Button></>}
      >
        <FormField label="Name"><Input data-testid="scan-name-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
        <FormField label="Type"><Select data-testid="scan-type-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {['asset_discovery','vulnerability_scan','exposure_scan','compliance_scan'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
        </Select></FormField>
        <FormField label="Target"><Input data-testid="scan-target-input" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} placeholder="e.g. 10.0.0.0/24" /></FormField>
      </Modal>
    </div>
  );
}
