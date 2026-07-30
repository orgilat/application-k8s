import React, { useEffect, useState } from 'react';
import { TopBar } from '../../components/Layout/TopBar';
import { LoadingSpinner } from '../../components/UI/LoadingSpinner';
import { Badge } from '../../components/UI/Badge';
import { dashboardApi } from '../../api';
import type { DashboardSummary, ActivityLog } from '../../types';

function StatCard({ label, value, color, testId }: { label: string; value: number | string; color: string; testId: string }) {
  return (
    <div data-testid={testId} style={{ background: '#1e293b', borderRadius: 10, padding: '20px 24px', border: '1px solid #334155' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [topAssets, setTopAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.summary(),
      dashboardApi.recentActivity(),
      dashboardApi.topRiskyAssets(),
    ]).then(([s, a, t]) => {
      setSummary(s);
      setActivity(a.data);
      setTopAssets(t.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <><TopBar title="Dashboard" /><LoadingSpinner /></>;

  return (
    <div data-testid="dashboard-page">
      <TopBar title="Dashboard" />
      <div style={{ padding: '24px' }}>
        <div data-testid="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard label="Total Assets" value={summary?.totalAssets ?? 0} color="#60a5fa" testId="stat-total-assets" />
          <StatCard label="Critical Findings" value={summary?.criticalFindings ?? 0} color="#f87171" testId="stat-critical-findings" />
          <StatCard label="Open Findings" value={summary?.openFindings ?? 0} color="#fb923c" testId="stat-open-findings" />
          <StatCard label="Scans Running" value={summary?.scansRunning ?? 0} color="#34d399" testId="stat-scans-running" />
          <StatCard label="Remediations Pending" value={summary?.remediationsPending ?? 0} color="#fbbf24" testId="stat-remediations-pending" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, border: '1px solid #334155' }}>
            <h3 data-testid="recent-activity-title" style={{ marginBottom: 16, color: '#f1f5f9', fontSize: 15 }}>Recent Activity</h3>
            <div data-testid="recent-activity-list">
              {activity.slice(0, 10).map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                  <span style={{ color: '#475569', minWidth: 80 }}>{a.entityType}</span>
                  <span style={{ color: '#94a3b8' }}>{a.action}</span>
                  <span style={{ color: '#64748b', marginLeft: 'auto' }}>{a.actor}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, border: '1px solid #334155' }}>
            <h3 data-testid="top-risky-assets-title" style={{ marginBottom: 16, color: '#f1f5f9', fontSize: 15 }}>Top Risky Assets</h3>
            <div data-testid="top-risky-assets-list">
              {topAssets.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                  <span style={{ color: '#475569', width: 20 }}>#{i+1}</span>
                  <span style={{ flex: 1, color: '#e2e8f0' }}>{a.name}</span>
                  <Badge value={a.criticality} type="severity" />
                  <span style={{ color: '#f87171', fontSize: 12 }}>{a.critical_count} crit</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
