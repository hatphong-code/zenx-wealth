import { AlertTriangle } from 'lucide-react';
import { useI18n } from '../../core/i18n/useI18n';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'danger', // 'danger' | 'default'
  onConfirm,
  onCancel,
}) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
        aria-label={cancelLabel || t('common.cancel', {}, 'Hủy')}
      />
      <div className="relative w-full max-w-sm rounded-t-zx border border-zx-line bg-zx-surface p-5 shadow-zx zx-transition md:rounded-zx">
        <div className="mb-3 flex items-center gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
              tone === 'danger' ? 'bg-zx-accent/20 text-zx-accent' : 'bg-zx-icon-bg text-zx-accent'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="font-zx-head text-base font-semibold text-zx-text">{title}</h2>
        </div>
        {description && <p className="mb-5 text-sm text-zx-text-soft">{description}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-zx-sm border border-zx-line bg-zx-surface-2 px-4 py-3 text-sm font-medium text-zx-text-soft transition hover:text-zx-text"
          >
            {cancelLabel || t('common.cancel', {}, 'Hủy')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-zx-sm px-4 py-3 text-sm font-semibold transition ${
              tone === 'danger'
                ? 'bg-zx-accent text-zx-on-accent hover:opacity-90'
                : 'bg-zx-accent text-zx-on-accent hover:opacity-90'
            }`}
          >
            {confirmLabel || t('common.confirm', {}, 'Xác nhận')}
          </button>
        </div>
      </div>
    </div>
  );
}
