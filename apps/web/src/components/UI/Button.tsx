import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const VARIANTS = {
  primary: { background: '#2563eb', color: '#fff', border: 'none' },
  secondary: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' },
  danger: { background: '#dc2626', color: '#fff', border: 'none' },
  ghost: { background: 'transparent', color: '#94a3b8', border: '1px solid #334155' },
};

const SIZES = {
  sm: { padding: '4px 10px', fontSize: 12 },
  md: { padding: '8px 16px', fontSize: 14 },
  lg: { padding: '10px 20px', fontSize: 15 },
};

export function Button({ variant = 'primary', size = 'md', loading, children, disabled, style, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        ...VARIANTS[variant],
        ...SIZES[size],
        borderRadius: 6,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        fontWeight: 500,
        transition: 'opacity 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        ...style,
      }}
    >
      {loading ? '...' : children}
    </button>
  );
}
