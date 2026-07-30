import React from 'react';

const INPUT_STYLE: React.CSSProperties = {
  background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
  color: '#e2e8f0', padding: '8px 12px', fontSize: 14, width: '100%',
  outline: 'none',
};

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...INPUT_STYLE, ...props.style }} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} style={{ ...INPUT_STYLE, cursor: 'pointer', ...props.style }}>
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 80, ...props.style }} />;
}

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 6, color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}
