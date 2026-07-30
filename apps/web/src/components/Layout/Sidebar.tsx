import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◈', testId: 'nav-dashboard' },
  { to: '/assets', label: 'Assets', icon: '⬡', testId: 'nav-assets' },
  { to: '/findings', label: 'Findings', icon: '⚠', testId: 'nav-findings' },
  { to: '/scans', label: 'Scans', icon: '⊙', testId: 'nav-scans' },
  { to: '/remediations', label: 'Remediations', icon: '⟳', testId: 'nav-remediations' },
  { to: '/tickets', label: 'Tickets', icon: '✦', testId: 'nav-tickets' },
  { to: '/reports', label: 'Reports', icon: '☷', testId: 'nav-reports' },
  { to: '/activity', label: 'Activity Log', icon: '≡', testId: 'nav-activity' },
  { to: '/users', label: 'Users', icon: '⊞', testId: 'nav-users' },
  { to: '/settings', label: 'Settings', icon: '⚙', testId: 'nav-settings' },
];

export function Sidebar() {
  return (
    <nav
      data-testid="sidebar"
      style={{
        width: 220, background: '#0d1117', borderRight: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, flexShrink: 0,
      }}
    >
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9', letterSpacing: 0.5 }}>ExposureOps</div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Security Platform</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            data-testid={item.testId}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 16px', textDecoration: 'none',
              color: isActive ? '#60a5fa' : '#94a3b8',
              background: isActive ? 'rgba(96,165,250,0.08)' : 'transparent',
              fontSize: 14, fontWeight: isActive ? 600 : 400,
              borderLeft: isActive ? '2px solid #60a5fa' : '2px solid transparent',
            })}
          >
            <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', fontSize: 12, color: '#475569' }}>
        demo@exposureops.io · admin
      </div>
    </nav>
  );
}
