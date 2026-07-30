import React from 'react';

interface Column<T> {
  key: string;
  title: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: number | string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
  'data-testid'?: string;
}

export function Table<T extends Record<string, unknown>>({ columns, data, rowKey, selectable, selectedIds = [], onSelect, onRowClick, ...props }: TableProps<T>) {
  const allSelected = data.length > 0 && data.every(r => selectedIds.includes(rowKey(r)));

  function toggleAll() {
    if (!onSelect) return;
    onSelect(allSelected ? [] : data.map(rowKey));
  }

  function toggleRow(id: string) {
    if (!onSelect) return;
    onSelect(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table data-testid={props['data-testid']} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #334155' }}>
            {selectable && (
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, width: 40 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} data-testid="select-all" />
              </th>
            )}
            {columns.map(col => (
              <th key={col.key} style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 500, width: col.width, whiteSpace: 'nowrap' }}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={rowKey(row)}
              data-testid={`table-row-${i}`}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: '1px solid #1e293b',
                cursor: onRowClick ? 'pointer' : 'default',
                background: selectedIds.includes(rowKey(row)) ? '#1e3a5f' : 'transparent',
              }}
              onMouseEnter={e => { if (onRowClick) (e.currentTarget as HTMLElement).style.background = '#1e293b'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selectedIds.includes(rowKey(row)) ? '#1e3a5f' : 'transparent'; }}
            >
              {selectable && (
                <td style={{ padding: '10px 12px' }} onClick={e => { e.stopPropagation(); toggleRow(rowKey(row)); }}>
                  <input type="checkbox" checked={selectedIds.includes(rowKey(row))} onChange={() => toggleRow(rowKey(row))} data-testid={`select-row-${i}`} />
                </td>
              )}
              {columns.map(col => (
                <td key={col.key} style={{ padding: '10px 12px', color: '#e2e8f0' }}>
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div data-testid="pagination" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#94a3b8', fontSize: 13 }}>
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '4px 10px', borderRadius: 4, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>←</button>
      <span>{page} / {totalPages} ({total} total)</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '4px 10px', borderRadius: 4, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>→</button>
    </div>
  );
}
