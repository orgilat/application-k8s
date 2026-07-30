import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, footer, width = 500 }: ModalProps) {
  if (!open) return null;
  return (
    <div
      data-testid="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        data-testid="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1e293b', borderRadius: 10, padding: 24, width, maxWidth: '95vw',
          maxHeight: '90vh', overflowY: 'auto', border: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div>{children}</div>
        {footer && <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
}
