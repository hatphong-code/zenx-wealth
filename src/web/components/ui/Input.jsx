const BASE = 'w-full rounded-zx-sm border bg-zx-surface-2 px-4 py-3 text-zx-text placeholder:text-zx-text-soft outline-none focus:ring-2 focus:ring-zx-accent transition';

export function Input({ className = '', error = false, ...props }) {
  return (
    <input
      className={`${BASE} ${error ? 'border-zx-negative' : 'border-zx-line'} ${className}`}
      {...props}
    />
  );
}
