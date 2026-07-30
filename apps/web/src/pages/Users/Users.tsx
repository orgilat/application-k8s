import React, { useEffect, useState } from 'react';
import { TopBar } from '../../components/Layout/TopBar';
import { Table } from '../../components/UI/Table';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { Input, Select, FormField } from '../../components/UI/Input';
import { Modal } from '../../components/UI/Modal';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { usersApi } from '../../api';
import type { User } from '../../types';

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'viewer' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { const res = await usersApi.list(); setUsers(res.data); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      await usersApi.create(form as any);
      setShowCreate(false);
      setForm({ name: '', email: '', role: 'viewer' });
      load();
    } finally { setSaving(false); }
  }

  const columns = [
    { key: 'name', title: 'Name', render: (_: unknown, r: User) => <span style={{ color: '#e2e8f0' }}>{r.name}</span> },
    { key: 'email', title: 'Email', render: (v: unknown) => <span style={{ color: '#94a3b8' }}>{String(v)}</span> },
    { key: 'role', title: 'Role', render: (v: unknown) => <Badge value={String(v)} type="status" /> },
    { key: 'status', title: 'Status', render: (v: unknown) => <Badge value={String(v)} type="status" /> },
    { key: 'createdAt', title: 'Joined', render: (v: unknown) => <span style={{ color: '#64748b', fontSize: 12 }}>{new Date(String(v)).toLocaleString()}</span> },
  ];

  return (
    <div data-testid="users-page">
      <TopBar title="Users" />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', marginBottom: 20 }}>
          <Button data-testid="new-user-btn" onClick={() => setShowCreate(true)} style={{ marginLeft: 'auto' }}>+ New User</Button>
        </div>
        {loading ? <LoadingSpinner /> : (
          <Table columns={columns as any} data={users as any} rowKey={r => r.id} data-testid="users-table" />
        )}
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New User"
        footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button loading={saving} onClick={handleCreate} data-testid="submit-create-user">Create</Button></>}
      >
        <FormField label="Name"><Input data-testid="user-name-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
        <FormField label="Email"><Input data-testid="user-email-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
        <FormField label="Role"><Select data-testid="user-role-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
          {['admin','security_analyst','automation_engineer','viewer'].map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
        </Select></FormField>
      </Modal>
    </div>
  );
}
