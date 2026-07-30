import React from 'react';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff4d4f',
  high: '#ff7a45',
  medium: '#ffc53d',
  low: '#52c41a',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#1890ff',
  acknowledged: '#722ed1',
  false_positive: '#8c8c8c',
  remediation_pending: '#fa8c16',
  remediation_in_progress: '#1890ff',
  resolved: '#52c41a',
  queued: '#8c8c8c',
  running: '#1890ff',
  completed: '#52c41a',
  failed: '#ff4d4f',
  canceled: '#8c8c8c',
  pending: '#fa8c16',
  approved: '#52c41a',
  rejected: '#ff4d4f',
  in_progress: '#1890ff',
  blocked: '#ff4d4f',
  done: '#52c41a',
  active: '#52c41a',
  inactive: '#8c8c8c',
  unknown: '#faad14',
  admin: '#722ed1',
  security_analyst: '#1890ff',
  automation_engineer: '#13c2c2',
  viewer: '#8c8c8c',
};

interface BadgeProps {
  value: string;
  type?: 'severity' | 'status' | 'default';
  'data-testid'?: string;
}

export function Badge({ value, type = 'default', ...props }: BadgeProps) {
  const color = type === 'severity' ? SEVERITY_COLORS[value] : STATUS_COLORS[value] || '#8c8c8c';
  return (
    <span
      data-testid={props['data-testid']}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        color: '#fff',
        background: color,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {value.replace(/_/g, ' ')}
    </span>
  );
}
