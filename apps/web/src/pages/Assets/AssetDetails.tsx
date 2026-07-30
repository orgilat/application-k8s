import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '../../components/Layout/TopBar';
import { Tabs } from '../../components/UI/Tabs';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { Modal } from '../../components/UI/Modal';
import { Input, Select, FormField } from '../../components/UI/Input';
import { Table } from '../../components/UI/Table';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { assetsApi } from '../../api';
import type { Asset, Finding, Scan, ActivityLog } from '../../types';

export function AssetDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCrit, setEditCrit] = useState(false);
  const [editOwner, setEditOwner] = useState(false);
  const [newCrit, setNewCrit] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      assetsApi.get(id),
      assetsApi.getFindings(id),
      assetsApi.getScans(id),
      assetsApi.getActivity(id),
    ]).then(([a, f, s, act]) => {
      setAsset(a); setFindings(f.data); setScans(s.data); setActivity(act.data);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleUpdateCriticality() {
    if (!id || !newCrit) return;
    setSaving(true);
    try {
      const updated = await assetsApi.updateCriticality(id, newCrit);
      setAsset(updated); setEditCrit(false);
    } finally { setSaving(false); }
  }

  async function handleUpdateOwner() {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await assetsApi.updateOwner(id, newOwner);
      setAsset(updated); setEditOwner(false);
    } finally { setSaving(false); }
  }

  async function handleAddTag() {
    if (!id || !newTag) return;
    const updated = await assetsApi.addTag(id, newTag);
    setAsset(updated); setNewTag('');
  }

  async function handleRemoveTag(tag: string) {
    if (!id) return;
    const updated = await assetsApi.removeTag(id, tag);
    setAsset(updated);
  }

  if (loading) return <><TopBar title="Asset Details" /><LoadingSpinner /></>;
  if (!asset) return <><TopBar title="Asset Details" /><div style={{ padding: 24, color: '#94a3b8' }}>Not found</div></>;

  const findingColumns = [
    { key: 'title', title: 'Title', render: (_: unknown, r: Finding) => <span style={{ color: '#60a5fa' }} onClick={() => navigate(`/findings/${r.id}`)}>{r.title}</span> },
    { key: 'severity', title: 'Severity', render: (v: unknown) => <Badge value={String(v)} type="severity" /> },
    { key: 'status', title: 'Status', render: (v: unknown) => <Badge value={String(v)} type="status" /> },
  ];

  const scanColumns = [
    { key: 'name', title: 'Name' },
    { key: 'type', title: 'Type' },
    { key: 'status', title: 'Status', render: (v: unknown) => <Badge value={String(v)} type="status" /> },
    { key: 'progress', title: 'Progress', render: (v: unknown) => `${v}%` },
  ];

  return (
    <div data-testid="asset-details-page">
      <TopBar title={asset.name} />
      <div style={{ padding: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/assets')} style={{ marginBottom: 16 }}>← Back</Button>

        <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 24, border: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
          <InfoRow label="Name" value={asset.name} />
          <InfoRow label="Type" value={asset.type} />
          <InfoRow label="Provider" value={asset.provider} />
          <InfoRow label="Environment" value={asset.environment} />
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Criticality</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge value={asset.criticality} type="severity" data-testid="asset-criticality" />
              <Button size="sm" variant="ghost" onClick={() => { setNewCrit(asset.criticality); setEditCrit(true); }} data-testid="edit-criticality-btn">Edit</Button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Owner</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#e2e8f0' }} data-testid="asset-owner">{asset.owner || '—'}</span>
              <Button size="sm" variant="ghost" onClick={() => { setNewOwner(asset.owner || ''); setEditOwner(true); }} data-testid="edit-owner-btn">Edit</Button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Tags</div>
            <div data-testid="asset-tags" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {asset.tags.map(tag => (
                <span key={tag} style={{ background: '#334155', color: '#94a3b8', padding: '2px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }} onClick={() => handleRemoveTag(tag)} data-testid={`tag-${tag}`}>{tag} ×</span>
              ))}
              <div style={{ display: 'flex', gap: 4 }}>
                <Input data-testid="tag-input" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add tag" style={{ width: 100, padding: '2px 8px', fontSize: 12 }} onKeyDown={e => e.key === 'Enter' && handleAddTag()} />
                <Button size="sm" onClick={handleAddTag} data-testid="add-tag-btn">+</Button>
              </div>
            </div>
          </div>
        </div>

        <Tabs tabs={[
          { key: 'overview', label: 'Overview', content: <AssetOverview asset={asset} /> },
          { key: 'findings', label: `Findings (${findings.length})`, content: <Table columns={findingColumns as any} data={findings as any} rowKey={r => r.id} data-testid="asset-findings-table" /> },
          { key: 'scans', label: `Scan History (${scans.length})`, content: <Table columns={scanColumns as any} data={scans as any} rowKey={r => r.id} data-testid="asset-scans-table" /> },
          { key: 'activity', label: 'Activity', content: <ActivityList items={activity} /> },
        ]} />
      </div>

      <Modal open={editCrit} onClose={() => setEditCrit(false)} title="Update Criticality"
        footer={<><Button variant="ghost" onClick={() => setEditCrit(false)}>Cancel</Button><Button loading={saving} onClick={handleUpdateCriticality} data-testid="save-criticality">Save</Button></>}
      >
        <FormField label="Criticality">
          <Select value={newCrit} onChange={e => setNewCrit(e.target.value)} data-testid="criticality-select">
            {['low','medium','high','critical'].map(v => <option key={v} value={v}>{v}</option>)}
          </Select>
        </FormField>
      </Modal>

      <Modal open={editOwner} onClose={() => setEditOwner(false)} title="Update Owner"
        footer={<><Button variant="ghost" onClick={() => setEditOwner(false)}>Cancel</Button><Button loading={saving} onClick={handleUpdateOwner} data-testid="save-owner">Save</Button></>}
      >
        <FormField label="Owner Email">
          <Input value={newOwner} onChange={e => setNewOwner(e.target.value)} data-testid="owner-input" />
        </FormField>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#e2e8f0' }}>{value}</div>
    </div>
  );
}

function AssetOverview({ asset }: { asset: Asset }) {
  return (
    <div data-testid="asset-overview">
      <div style={{ color: '#94a3b8', fontSize: 14 }}>
        <p>Created: {new Date(asset.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(asset.updatedAt).toLocaleString()}</p>
        <p>Status: <Badge value={asset.status} type="status" /></p>
      </div>
    </div>
  );
}

function ActivityList({ items }: { items: ActivityLog[] }) {
  return (
    <div data-testid="asset-activity-list">
      {items.map(a => (
        <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #1e293b', fontSize: 13, display: 'flex', gap: 12 }}>
          <span style={{ color: '#475569' }}>{new Date(a.createdAt).toLocaleString()}</span>
          <span style={{ color: '#94a3b8' }}>{a.action}</span>
          <span style={{ color: '#64748b' }}>{a.actor}</span>
        </div>
      ))}
    </div>
  );
}
