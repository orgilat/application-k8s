import React, { useEffect, useState, useCallback } from 'react';
import { TopBar } from '../../components/Layout/TopBar';
import { Table, Pagination } from '../../components/UI/Table';
import { Select } from '../../components/UI/Input';
import { LoadingSpinner, EmptyState } from '../../components/UI/LoadingSpinner';
import { activityApi } from '../../api';
import type { ActivityLog as ActivityLogType } from '../../types';

export function ActivityLog() {
  const [items, setItems] = useState<ActivityLogType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: '50' };
      if (filterEntity) params.entity_type = filterEntity;
      const res = await activityApi.list(params);
      setItems(res.data); setTotal(res.total);
    } finally { setLoading(false); }
  }, [page, filterEntity]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'createdAt', title: 'Time', render: (v: unknown) => <span style={{ color: '#64748b', fontSize: 12 }}>{new Date(String(v)).toLocaleString()}</span> },
    { key: 'entityType', title: 'Entity', render: (v: unknown) => <span style={{ color: '#60a5fa', textTransform: 'capitalize' as const }}>{String(v)}</span> },
    { key: 'action', title: 'Action', render: (v: unknown) => <span style={{ color: '#e2e8f0' }}>{String(v).replace(/_/g,' ')}</span> },
    { key: 'actor', title: 'Actor', render: (v: unknown) => <span style={{ color: '#94a3b8' }}>{String(v || '—')}</span> },
  ];

  return (
    <div data-testid="activity-page">
      <TopBar title="Activity Log" />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <Select data-testid="filter-entity-type" value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(1); }} style={{ maxWidth: 180 }}>
            <option value="">All Entities</option>
            {['asset','finding','scan','remediation','ticket','report'].map(e => <option key={e} value={e}>{e}</option>)}
          </Select>
        </div>
        {loading ? <LoadingSpinner /> : items.length === 0 ? <EmptyState title="No activity" /> : (
          <>
            <Table columns={columns as any} data={items as any} rowKey={r => r.id} data-testid="activity-table" />
            <Pagination page={page} pageSize={50} total={total} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
