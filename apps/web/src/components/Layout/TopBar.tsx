import React from 'react';

export function TopBar({ title }: { title: string }) {
  return (
    <div
      data-testid="topbar"
      style={{
        height: 56, background: '#0d1117', borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 100,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#f1f5f9' }}>{title}</h1>
    </div>
  );
}
