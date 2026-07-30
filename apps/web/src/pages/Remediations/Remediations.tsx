import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Table, Pagination } from '../../components/UI/Table';
import { Badge } from '../../components/UI/Badge';
import { Select } from '../../components/UI/Input';
import { LoadingSpinner, EmptyState } from '../../components/UI/LoadingSpinner';
import { remediationsApi } from '../../api';
import type { Remediation } from '../../types';

export function Remediations() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Remediation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: '20' };
      if (filterStatus) params.status = filterStatus;
      const res = await remediationsApi.list(params);
      setItems(res.data); setTotal(res.total);
    } finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'title', title: 'Title', render: (_: unknown, r: Remediation) => <span style={{ color: '#60a5fa' }}>{r.title}</span> },
    { key: 'status', title: 'Status', render: (v: unknown) => <Badge value={String(v)} type="status" /> },
    { key: 'findingTitle', title: 'Finding', render: (v: unknown) => <span style={{ color: '#94a3b8', fontSize: 13 }}>{String(v || '—')}</span> },
    { key: 'assignedTo', title: 'Assigned To', render: (v: unknown) => <span style={{ color: '#64748b' }}>{String(v || '—')}</span> },
    { key: 'createdAt', title: 'Created', render: (v: unknown) => <span style={{ color: '#64748b', fontSize: 12 }}>{new Date(String(v)).toLocaleString()}</span> },
  ];

  return (
    <div data-testid="remediations-page">
      <TopBar title="Remediation Center" />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <Select data-testid="filter-status" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ maxWidth: 180 }}>
            <option value="">All Statuses</option>
            {['pending','approved','rejected','in_progress','completed','failed'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </Select>
        </div>
        {loading ? <LoadingSpinner /> : items.length === 0 ? <EmptyState title="No remediations" /> : (
          <>
            <Table columns={columns as any} data={items as any} rowKey={r => r.id} onRowClick={r => navigate(`/remediations/${r.id}`)} data-testid="remediations-table" />
            <Pagination page={page} pageSize={20} total={total} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
