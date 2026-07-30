import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Table, Pagination } from '../../components/UI/Table';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { Input, Select, FormField } from '../../components/UI/Input';
import { Modal } from '../../components/UI/Modal';
import { LoadingSpinner, EmptyState } from '../../components/UI/LoadingSpinner';
import { assetsApi } from '../../api';
import type { Asset } from '../../types';

export function Assets() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCriticality, setFilterCriticality] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'server', provider: 'aws', environment: 'prod', criticality: 'medium', owner: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: '20' };
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterCriticality) params.criticality = filterCriticality;
      if (filterStatus) params.status = filterStatus;
      const res = await assetsApi.list(params);
      setAssets(res.data);
      setTotal(res.total);
    } finally { setLoading(false); }
  }, [page, search, filterType, filterCriticality, filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.name) return;
    setSaving(true);
    try {
      await assetsApi.create(form as any);
      setShowCreate(false);
      setForm({ name: '', type: 'server', provider: 'aws', environment: 'prod', criticality: 'medium', owner: '' });
      load();
    } finally { setSaving(false); }
  }

  const columns = [
    { key: 'name', title: 'Name', render: (_: unknown, r: Asset) => <span style={{ color: '#60a5fa', cursor: 'pointer' }}>{r.name}</span> },
    { key: 'type', title: 'Type' },
    { key: 'provider', title: 'Provider' },
    { key: 'environment', title: 'Env' },
    { key: 'criticality', title: 'Criticality', render: (v: unknown) => <Badge value={String(v)} type="severity" /> },
    { key: 'status', title: 'Status', render: (v: unknown) => <Badge value={String(v)} type="status" /> },
    { key: 'owner', title: 'Owner', render: (v: unknown) => <span style={{ color: '#94a3b8' }}>{String(v || '—')}</span> },
  ];

  return (
    <div data-testid="assets-page">
      <TopBar title="Assets" />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <Input data-testid="search-input" placeholder="Search assets..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 260 }} />
          <Select data-testid="filter-type" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} style={{ maxWidth: 160 }}>
            <option value="">All Types</option>
            {['server','domain','ip','container','database','bucket','application'].map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select data-testid="filter-criticality" value={filterCriticality} onChange={e => { setFilterCriticality(e.target.value); setPage(1); }} style={{ maxWidth: 160 }}>
            <option value="">All Criticalities</option>
            {['low','medium','high','critical'].map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select data-testid="filter-status" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ maxWidth: 160 }}>
            <option value="">All Statuses</option>
            {['active','inactive','unknown'].map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Button data-testid="create-asset-btn" onClick={() => setShowCreate(true)} style={{ marginLeft: 'auto' }}>+ New Asset</Button>
        </div>

        {loading ? <LoadingSpinner /> : assets.length === 0 ? <EmptyState title="No assets found" /> : (
          <>
            <Table columns={columns as any} data={assets as any} rowKey={r => r.id} onRowClick={r => navigate(`/assets/${r.id}`)} data-testid="assets-table" />
            <Pagination page={page} pageSize={20} total={total} onChange={setPage} />
          </>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Asset"
        footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button loading={saving} onClick={handleCreate} data-testid="submit-create-asset">Create</Button></>}
      >
        <FormField label="Name"><Input data-testid="input-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
        <FormField label="Type"><Select data-testid="input-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {['server','domain','ip','container','database','bucket','application'].map(t => <option key={t} value={t}>{t}</option>)}
        </Select></FormField>
        <FormField label="Provider"><Select data-testid="input-provider" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
          {['aws','azure','gcp','on-prem'].map(t => <option key={t} value={t}>{t}</option>)}
        </Select></FormField>
        <FormField label="Environment"><Select data-testid="input-environment" value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}>
          {['prod','staging','dev'].map(t => <option key={t} value={t}>{t}</option>)}
        </Select></FormField>
        <FormField label="Criticality"><Select data-testid="input-criticality" value={form.criticality} onChange={e => setForm(f => ({ ...f, criticality: e.target.value }))}>
          {['low','medium','high','critical'].map(t => <option key={t} value={t}>{t}</option>)}
        </Select></FormField>
        <FormField label="Owner"><Input data-testid="input-owner" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} /></FormField>
      </Modal>
    </div>
  );
}
