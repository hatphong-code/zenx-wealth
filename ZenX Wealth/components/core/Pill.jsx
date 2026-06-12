import React from 'react';

const TONES = {
  accent: { background: 'var(--zx-accent-soft)', color: 'var(--zx-accent)' },
  positive: { background: 'var(--zx-positive-soft)', color: 'var(--zx-positive)' },
  neutral: { background: 'var(--zx-surface-2)', color: 'var(--zx-text-soft)' },
  solid: { background: 'var(--zx-accent)', color: 'var(--zx-on-accent)' },
};

/** Pill — compact rounded status/label chip. */
export function Pill({ tone = 'neutral', style = {}, children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
      fontFamily: 'var(--zx-font-body)', fontSize: 12, fontWeight: 600,
      padding: '6px 12px', borderRadius: 'var(--zx-radius-pill)',
      ...TONES[tone], ...style,
    }}>{children}</span>
  );
}
