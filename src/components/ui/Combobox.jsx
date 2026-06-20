import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export function Combobox({
  options = [],          // [{ value, label }] or string[]
  value = '',
  onChange,
  placeholder = '',
  className = '',
  emptyLabel = 'Tất cả',
  emptyValue = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const normalized = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const filtered = query
    ? normalized.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : normalized;

  const selectedLabel = normalized.find(o => o.value === value)?.label ?? '';

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className="flex items-center gap-1 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-1.5 text-sm text-zx-text cursor-pointer"
        onClick={() => { if (!disabled) { setOpen(v => !v); setTimeout(() => inputRef.current?.focus(), 10); } }}
      >
        <span className={`flex-1 truncate ${!value ? 'text-zx-text-soft' : ''}`}>
          {value ? selectedLabel : emptyLabel}
        </span>
        {value ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); select(emptyValue); }}
            className="shrink-0 text-zx-text-soft hover:text-zx-text" aria-label="Xóa bộ lọc">
            <X className="h-3 w-3" />
          </button>
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zx-text-soft transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-full min-w-[160px] rounded-zx-sm border border-zx-line bg-zx-surface shadow-zx overflow-hidden">
          <div className="border-b border-zx-line px-3 py-2">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm..."
              className="w-full bg-transparent text-sm text-zx-text placeholder:text-zx-text-soft outline-none"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            <button type="button" onClick={() => select(emptyValue)}
              className={`w-full px-3 py-2 text-left text-sm transition hover:bg-zx-surface-2 ${!value ? 'text-zx-accent font-medium' : 'text-zx-text-soft'}`}>
              {emptyLabel}
            </button>
            {filtered.map(o => (
              <button key={o.value} type="button" onClick={() => select(o.value)}
                className={`w-full px-3 py-2 text-left text-sm transition hover:bg-zx-surface-2 ${o.value === value ? 'text-zx-accent font-medium' : 'text-zx-text'}`}>
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-zx-text-soft">Không tìm thấy</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
