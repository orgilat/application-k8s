import React, { useEffect, useState } from 'react';
import { TopBar } from '../../components/Layout/TopBar';
import { Button } from '../../components/UI/Button';
import { Input, FormField } from '../../components/UI/Input';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { settingsApi } from '../../api';

export function Settings() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi.get().then(s => {
      setSettings(s);
      setOrgName(String(s.organization_name || ''));
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await settingsApi.update({ organization_name: orgName });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  if (loading) return <><TopBar title="Settings" /><LoadingSpinner /></>;

  return (
    <div data-testid="settings-page">
      <TopBar title="Settings" />
      <div style={{ padding: 24, maxWidth: 600 }}>
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 24, border: '1px solid #334155', marginBottom: 24 }}>
          <h3 style={{ color: '#f1f5f9', marginBottom: 20 }}>Organization</h3>
          <FormField label="Organization Name">
            <Input data-testid="org-name-input" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </FormField>
          <Button loading={saving} onClick={handleSave} data-testid="save-settings-btn">
            {saved ? '✓ Saved' : 'Save Changes'}
          </Button>
        </div>

        <div style={{ background: '#1e293b', borderRadius: 10, padding: 24, border: '1px solid #334155', marginBottom: 24 }}>
          <h3 style={{ color: '#f1f5f9', marginBottom: 16 }}>Current Settings</h3>
          <pre data-testid="settings-content" style={{ color: '#94a3b8', fontSize: 13, overflowX: 'auto' }}>
            {JSON.stringify(settings, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
