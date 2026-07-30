import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Table, Pagination } from '../../components/UI/Table';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { Input, Select } from '../../components/UI/Input';
import { LoadingSpinner, EmptyState } from '../../components/UI/LoadingSpinner';
import { findingsApi } from '../../api';
import type { Finding } from '../../types';

export function Findings() {
  const navigate = useNavigate();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: '20' };
      if (search) params.search = search;
      if (filterSeverity) params.severity = filterSeverity;
      if (filterStatus) params.status = filterStatus;
      const res = await findingsApi.list(params);
      setFindings(res.data); setTotal(res.total);
    } finally { setLoading(false); }
  }, [page, search, filterSeverity, filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function bulkAck() {
    if (!selected.length) return;
    setBulkLoading(true);
    try { await findingsApi.bulkAcknowledge(selected); setSelected([]); load(); }
    finally { setBulkLoading(false); }
  }

  async function bulkFP() {
    if (!selected.length) return;
    setBulkLoading(true);
    try { await findingsApi.bulkFalsePositive(selected); setSelected([]); load(); }
    finally { setBulkLoading(false); }
  }

  const columns = [
    { key: 'title', title: 'Title', render: (_: unknown, r: Finding) => <span style={{ color: '#60a5fa' }}>{r.title}</span> },
    { key: 'severity', title: 'Severity', render: (v: unknown) => <Badge value={String(v)} type="severity" /> },
    { key: 'status', title: 'Status', render: (v: unknown) => <Badge value={String(v)} type="status" /> },
    { key: 'category', title: 'Category', render: (v: unknown) => <span style={{ color: '#94a3b8' }}>{String(v).replace(/_/g, ' ')}</span> },
    { key: 'assetName', title: 'Asset', render: (v: unknown) => <span style={{ color: '#64748b' }}>{String(v || '—')}</span> },
    { key: 'assignedTo', title: 'Assignee', render: (v: unknown) => <span style={{ color: '#64748b' }}>{String(v || '—')}</span> },
  ];

  return (
    <div data-testid="findings-page">
      <TopBar title="Findings" />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input data-testid="search-input" placeholder="Search findings..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 260 }} />
          <Select data-testid="filter-severity" value={filterSeverity} onChange={e => { setFilterSeverity(e.target.value); setPage(1); }} style={{ maxWidth: 160 }}>
            <option value="">All Severities</option>
            {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select data-testid="filter-status" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ maxWidth: 180 }}>
            <option value="">All Statuses</option>
            {['open','acknowledged','false_positive','remediation_pending','remediation_in_progress','resolved'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </Select>
          {selected.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>{selected.length} selected</span>
              <Button size="sm" variant="secondary" loading={bulkLoading} onClick={bulkAck} data-testid="bulk-acknowledge-btn">Acknowledge</Button>
              <Button size="sm" variant="ghost" loading={bulkLoading} onClick={bulkFP} data-testid="bulk-false-positive-btn">False Positive</Button>
            </div>
          )}
        </div>

        {loading ? <LoadingSpinner /> : findings.length === 0 ? <EmptyState title="No findings" /> : (
          <>
            <Table
              columns={columns as any} data={findings as any} rowKey={r => r.id}
              selectable selectedIds={selected} onSelect={setSelected}
              onRowClick={r => navigate(`/findings/${r.id}`)}
              data-testid="findings-table"
            />
            <Pagination page={page} pageSize={20} total={total} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
