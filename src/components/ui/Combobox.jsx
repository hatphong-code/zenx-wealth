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
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const normalized = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const filtered = query
    ? normalized.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : normalized;

  // All items including the "empty" option at index 0
  const allItems = [{ value: emptyValue, label: emptyLabel }, ...filtered];

  const selectedLabel = normalized.find(o => o.value === value)?.label ?? '';

  useEffect(() => {
    if (!open) { setQuery(''); setActiveIndex(-1); }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const select = (val) => {
    onChange(val);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) select(allItems[activeIndex].value);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        className="flex items-center gap-1 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-1.5 text-sm text-zx-text cursor-pointer focus:outline-none focus:ring-2 focus:ring-zx-accent"
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
              onChange={e => { setQuery(e.target.value); setActiveIndex(-1); }}
              placeholder="Tìm..."
              className="w-full bg-transparent text-sm text-zx-text placeholder:text-zx-text-soft outline-none"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div ref={listRef} role="listbox" className="max-h-52 overflow-y-auto">
            {allItems.map((o, i) => (
              <button
                key={o.value || '__empty__'}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => select(o.value)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full px-3 py-2 text-left text-sm transition ${
                  i === activeIndex ? 'bg-zx-surface-2' : ''
                } ${
                  o.value === value ? 'text-zx-accent font-medium' :
                  o.value === emptyValue ? 'text-zx-text-soft' : 'text-zx-text'
                }`}
              >
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
