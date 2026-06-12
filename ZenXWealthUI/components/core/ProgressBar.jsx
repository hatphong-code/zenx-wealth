import React from 'react';

/** ProgressBar — themed track + gradient fill. `pct` is 0–100. */
export function ProgressBar({ pct = 0, height, style = {} }) {
  return (
    <div style={{ height: height || 'var(--zx-bar-h)', borderRadius: 'var(--zx-radius-pill)',
      background: 'var(--zx-track)', overflow: 'hidden', ...style }}>
      <div style={{ height: '100%', borderRadius: 'var(--zx-radius-pill)', background: 'var(--zx-fill)',
        width: Math.max(0, Math.min(100, pct)) + '%', transition: 'width .7s cubic-bezier(.2,.7,.3,1)' }} />
    </div>
  );
}
