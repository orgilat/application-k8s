import React from 'react';

export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div data-testid="loading-spinner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: '#94a3b8', gap: 10 }}>
      <div style={{ width: 20, height: 20, border: '2px solid #334155', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {text}
    </div>
  );
}

export function EmptyState({ title = 'No data', message = 'Nothing to show here.' }: { title?: string; message?: string }) {
  return (
    <div data-testid="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, color: '#64748b' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>◎</div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{message}</div>
    </div>
  );
}
