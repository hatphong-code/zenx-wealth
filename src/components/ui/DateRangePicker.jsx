import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { enUS, vi } from 'react-day-picker/locale';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import 'react-day-picker/style.css';

function fmt(d) {
  if (!d) return '';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function DateRangePicker({ value, onChange, placeholder, presets = [] }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(value ?? { from: undefined, to: undefined });
  const containerRef = useRef(null);

  // Sync external value
  useEffect(() => { setPending(value ?? { from: undefined, to: undefined }); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (range) => {
    const next = range ?? { from: undefined, to: undefined };
    setPending(next);
    if (next.from && next.to) {
      onChange(next);
      setOpen(false);
    }
  };

  const clear = (e) => {
    e.stopPropagation();
    const empty = { from: undefined, to: undefined };
    setPending(empty);
    onChange(empty);
  };

  const applyPreset = (range) => {
    setPending(range);
    onChange(range);
    setOpen(false);
  };

  const hasRange = value?.from && value?.to;
  const label = hasRange
    ? `${fmt(value.from)} – ${fmt(value.to)}`
    : (placeholder ?? t('dateRange.placeholder', {}, 'Chọn khoảng thời gian'));

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-3 py-1.5 text-sm transition hover:text-zx-text"
      >
        <Calendar className="h-3.5 w-3.5 shrink-0 text-zx-text-soft" />
        <span className={hasRange ? 'text-zx-text' : 'text-zx-text-soft'}>{label}</span>
        {hasRange
          ? <button type="button" onClick={clear} aria-label="Xóa khoảng thời gian"
              className="text-zx-text-soft hover:text-zx-text shrink-0">
              <X className="h-3 w-3" />
            </button>
          : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zx-text-soft" />
        }
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 rounded-zx border border-zx-line bg-zx-surface shadow-zx overflow-hidden"
          style={{ minWidth: 320 }}>

          {/* Presets */}
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-zx-line px-3 py-2.5">
              {presets.map(p => (
                <button key={p.label} type="button" onClick={() => applyPreset(p.range)}
                  className="rounded-full border border-zx-line px-3 py-1 text-xs text-zx-text-soft transition hover:border-zx-accent hover:text-zx-accent">
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Calendar */}
          <div className="zx-rdp p-2">
            <DayPicker
              mode="range"
              selected={pending}
              onSelect={handleSelect}
              numberOfMonths={2}
              showOutsideDays
              locale={locale === 'vi' ? vi : enUS}
            />
          </div>

          {/* Footer hint */}
          <div className="border-t border-zx-line px-3 py-2 text-xs text-zx-text-soft">
            {t('dateRange.hint', {}, 'Chọn ngày bắt đầu, rồi ngày kết thúc')}
          </div>
        </div>
      )}
    </div>
  );
}
