import React, { useState } from 'react';

interface Tab {
  key: string;
  label: string;
  content: React.ReactNode;
}

export function Tabs({ tabs, defaultTab }: { tabs: Tab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.key);
  return (
    <div data-testid="tabs">
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #334155', marginBottom: 20 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            data-testid={`tab-${t.key}`}
            onClick={() => setActive(t.key)}
            style={{
              padding: '10px 16px', background: 'none', border: 'none',
              cursor: 'pointer', fontWeight: 500, fontSize: 14,
              color: active === t.key ? '#2563eb' : '#94a3b8',
              borderBottom: active === t.key ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.find(t => t.key === active)?.content}
    </div>
  );
}
