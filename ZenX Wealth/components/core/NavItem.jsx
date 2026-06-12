import React from 'react';

/** NavItem — sidebar / bottom-tab navigation entry. Pass `icon` as a node. */
export function NavItem({ icon, label, active = false, vertical = false, onClick }) {
  const color = active ? 'var(--zx-accent)' : 'var(--zx-text-soft)';
  if (vertical) {
    return (
      <button onClick={onClick} style={{ border: 'none', background: 'transparent', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0',
        fontFamily: 'var(--zx-font-body)', color }}>
        {icon}
        <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{label}</span>
      </button>
    );
  }
  return (
    <button onClick={onClick} style={{ border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 'var(--zx-radius-sm)',
      fontFamily: 'var(--zx-font-body)', fontSize: 14, fontWeight: active ? 700 : 500, color,
      background: active ? 'var(--zx-accent-soft)' : 'transparent', transition: 'all .2s' }}>
      {icon}{label}
    </button>
  );
}
