import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Table, Pagination } from '../../components/UI/Table';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { Input, Select, FormField, Textarea } from '../../components/UI/Input';
import { Modal } from '../../components/UI/Modal';
import { LoadingSpinner, EmptyState } from '../../components/UI/LoadingSpinner';
import { ticketsApi } from '../../api';
import type { Ticket } from '../../types';

export function Tickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: '20' };
      if (filterStatus) params.status = filterStatus;
      const res = await ticketsApi.list(params);
      setTickets(res.data); setTotal(res.total);
    } finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.title) return;
    setSaving(true);
    try {
      await ticketsApi.create(form as any);
      setShowCreate(false);
      setForm({ title: '', description: '', priority: 'medium' });
      load();
    } finally { setSaving(false); }
  }

  const columns = [
    { key: 'title', title: 'Title', render: (_: unknown, r: Ticket) => <span style={{ color: '#60a5fa' }}>{r.title}</span> },
    { key: 'status', title: 'Status', render: (v: unknown) => <Badge value={String(v)} type="status" /> },
    { key: 'priority', title: 'Priority', render: (v: unknown) => <Badge value={String(v)} type="severity" /> },
    { key: 'findingTitle', title: 'Finding', render: (v: unknown) => <span style={{ color: '#94a3b8', fontSize: 13 }}>{String(v || '—')}</span> },
    { key: 'assignedTo', title: 'Assigned To', render: (v: unknown) => <span style={{ color: '#64748b' }}>{String(v || '—')}</span> },
    { key: 'createdAt', title: 'Created', render: (v: unknown) => <span style={{ color: '#64748b', fontSize: 12 }}>{new Date(String(v)).toLocaleString()}</span> },
  ];

  return (
    <div data-testid="tickets-page">
      <TopBar title="Tickets" />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <Select data-testid="filter-status" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ maxWidth: 180 }}>
            <option value="">All Statuses</option>
            {['open','in_progress','blocked','done'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </Select>
          <Button data-testid="new-ticket-btn" onClick={() => setShowCreate(true)} style={{ marginLeft: 'auto' }}>+ New Ticket</Button>
        </div>
        {loading ? <LoadingSpinner /> : tickets.length === 0 ? <EmptyState title="No tickets" /> : (
          <>
            <Table columns={columns as any} data={tickets as any} rowKey={r => r.id} onRowClick={r => navigate(`/tickets/${r.id}`)} data-testid="tickets-table" />
            <Pagination page={page} pageSize={20} total={total} onChange={setPage} />
          </>
        )}
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Ticket"
        footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button loading={saving} onClick={handleCreate} data-testid="submit-create-ticket">Create</Button></>}
      >
        <FormField label="Title"><Input data-testid="ticket-title-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FormField>
        <FormField label="Description"><Textarea data-testid="ticket-desc-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></FormField>
        <FormField label="Priority"><Select data-testid="ticket-priority-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
          {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
        </Select></FormField>
      </Modal>
    </div>
  );
}
