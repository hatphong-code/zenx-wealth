import { useEffect } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return;

    const el = ref.current;
    const prev = document.activeElement;

    // Focus first focusable element
    const focusable = [...el.querySelectorAll(FOCUSABLE)];
    focusable[0]?.focus();

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) { e.preventDefault(); return; }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    return () => {
      el.removeEventListener('keydown', handleKeyDown);
      prev?.focus();
    };
  }, [active, ref]);
}
