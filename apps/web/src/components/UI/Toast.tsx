import React from 'react';
import type { Toast } from '../../hooks/useToast';

const TYPE_COLORS = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div
      data-testid="toast-container"
      style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          data-testid={`toast-${t.type}`}
          onClick={() => onRemove(t.id)}
          style={{
            background: TYPE_COLORS[t.type], color: '#fff',
            padding: '10px 16px', borderRadius: 8, fontSize: 14,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', cursor: 'pointer',
            minWidth: 220, maxWidth: 360,
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
