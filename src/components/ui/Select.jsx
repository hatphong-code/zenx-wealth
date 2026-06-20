const BASE = 'w-full rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-zx-text outline-none focus:ring-2 focus:ring-zx-accent transition';

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`${BASE} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
