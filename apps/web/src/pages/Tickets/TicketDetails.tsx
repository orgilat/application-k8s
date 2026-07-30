import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { Select, FormField } from '../../components/UI/Input';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { ticketsApi } from '../../api';
import type { Ticket } from '../../types';

export function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (!id) return;
    ticketsApi.get(id).then(t => { setTicket(t); setNewStatus(t.status); }).finally(() => setLoading(false));
  }, [id]);

  async function handleUpdateStatus() {
    if (!id || !newStatus) return;
    setSaving(true);
    try { setTicket(await ticketsApi.update(id, { status: newStatus as any })); } finally { setSaving(false); }
  }

  if (loading) return <><TopBar title="Ticket" /><LoadingSpinner /></>;
  if (!ticket) return <><TopBar title="Ticket" /><div style={{ padding: 24, color: '#94a3b8' }}>Not found</div></>;

  return (
    <div data-testid="ticket-details-page">
      <TopBar title={ticket.title} />
      <div style={{ padding: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')} style={{ marginBottom: 16 }}>← Back</Button>
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 data-testid="ticket-title" style={{ color: '#f1f5f9', fontSize: 18, marginBottom: 8 }}>{ticket.title}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <Badge value={ticket.status} type="status" data-testid="ticket-status" />
                <Badge value={ticket.priority} type="severity" data-testid="ticket-priority" />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Finding" value={ticket.findingTitle || '—'} />
            <Field label="Assigned To" value={ticket.assignedTo || '—'} />
            <Field label="Created By" value={ticket.createdBy || '—'} />
            <Field label="Created" value={new Date(ticket.createdAt).toLocaleString()} />
          </div>
          {ticket.description && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Description</div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>{ticket.description}</div>
            </div>
          )}
          <div style={{ marginTop: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ maxWidth: 160 }} data-testid="status-select">
              {['open','in_progress','blocked','done'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </Select>
            <Button loading={saving} onClick={handleUpdateStatus} data-testid="update-status-btn">Update Status</Button>
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
