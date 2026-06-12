import React from 'react';

/**
 * Panel — the ZenX surface container. `card` = boxed (surface + border + shadow);
 * `open` = the "Ít khung" style (transparent, separated by a top hairline).
 */
export function Panel({ variant = 'card', hero = false, first = false, onClick, style = {}, children }) {
  const base = { transition: 'background .5s, border-color .5s, box-shadow .5s', ...style };
  if (variant === 'open') {
    return (
      <div onClick={onClick} style={{
        borderTop: first ? 'none' : '1px solid var(--zx-line)',
        paddingTop: first ? 0 : 'var(--zx-space-6)',
        marginTop: first ? 0 : 'var(--zx-space-6)',
        ...base,
      }}>{children}</div>
    );
  }
  return (
    <div onClick={onClick} style={{
      background: hero ? 'var(--zx-bg-gradient)' : 'var(--zx-surface)',
      border: 'var(--zx-card-border)',
      borderRadius: 'var(--zx-radius)',
      boxShadow: 'var(--zx-shadow)',
      padding: 'var(--zx-space-6)',
      ...base,
    }}>{children}</div>
  );
}
