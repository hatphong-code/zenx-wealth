import React from 'react';
import { ProgressBar } from './ProgressBar.jsx';

/**
 * StatTile — icon + label + big figure + sub (or progress bar). The core
 * metric unit on the dashboard. Pass `icon` as an SVG/node.
 */
export function StatTile({ icon, label, value, sub, subTone = 'soft', pct = null, color = 'var(--zx-accent)', onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {icon != null && (
        <div style={{ width: 36, height: 36, borderRadius: 'var(--zx-radius-sm)', background: 'var(--zx-icon-bg)',
          color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      )}
      <div style={{ fontFamily: 'var(--zx-font-body)', fontSize: 12.5, fontWeight: 600, color: 'var(--zx-text-soft)', marginTop: 14 }}>{label}</div>
      <div style={{ fontFamily: 'var(--zx-font-display)', fontWeight: 'var(--zx-weight-display)', fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-.01em', fontSize: 23, color: 'var(--zx-text)', marginTop: 4 }}>{value}</div>
      {pct != null && <ProgressBar pct={pct} style={{ marginTop: 9 }} />}
      {sub != null && (
        <div style={{ fontFamily: 'var(--zx-font-body)', fontSize: 11.5, fontWeight: 600, marginTop: pct != null ? 7 : 5,
          color: subTone === 'positive' ? 'var(--zx-positive)' : 'var(--zx-text-soft)' }}>{sub}</div>
      )}
    </div>
  );
}
