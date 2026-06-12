import React from 'react';

/** Segmented — pill segmented control for 2–3 short options. Controlled. */
export function Segmented({ value, onChange, options = [], dark = false }) {
  return (
    <div style={{ display: 'inline-flex', padding: 3, borderRadius: 'var(--zx-radius-pill)', gap: 2,
      background: dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.05)' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange && onChange(o.value)} style={{
            border: 'none', cursor: 'pointer', borderRadius: 'var(--zx-radius-pill)', padding: '7px 14px',
            fontFamily: 'var(--zx-font-body)', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all .2s',
            background: on ? (dark ? '#fff' : '#1A1714') : 'transparent',
            color: on ? (dark ? '#15263C' : '#fff') : (dark ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.55)'),
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}
