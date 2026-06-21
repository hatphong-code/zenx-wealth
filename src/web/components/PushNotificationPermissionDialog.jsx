import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useI18n } from '../../core/i18n/useI18n';
import { PushNotificationService } from '../../core/services/pushNotificationService';

export default function PushNotificationPermissionDialog({ open = false, onOpenChange = () => {} }) {
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(open);
  const [requestState, setRequestState] = useState('idle'); // idle | requesting | done

  // Sync external open prop
  useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  const handleRequestPermission = async () => {
    setRequestState('requesting');
    const permitted = await PushNotificationService.requestPermission();
    if (permitted) {
      // Register service worker
      await PushNotificationService.registerServiceWorker();
      // Get FCM token
      await PushNotificationService.getFCMToken();
      PushNotificationService.setNotificationEnabled(true);
    } else {
      PushNotificationService.setNotificationEnabled(false);
    }
    setRequestState('done');
    setTimeout(() => {
      setInternalOpen(false);
      onOpenChange(false);
      setRequestState('idle');
    }, 1000);
  };

  const handleDismiss = () => {
    PushNotificationService.setNotificationEnabled(false);
    setInternalOpen(false);
    onOpenChange(false);
  };

  if (!internalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center bg-black/20 md:bg-black/30 p-4 md:p-0">
      <div className="w-full md:w-96 rounded-zx-sm bg-zx-surface border border-zx-line shadow-zx md:rounded-zx">
        <div className="p-4 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-zx-pill bg-zx-accent/20">
              <Bell className="h-4 w-4 text-zx-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-zx-text">
                {t('notifications.permissionDialog.title')}
              </h2>
              <p className="mt-1 text-xs leading-5 text-zx-text-soft">
                {t('notifications.permissionDialog.description')}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3 md:justify-end">
            <button
              onClick={handleDismiss}
              className="flex-1 md:flex-0 px-3 py-2 text-xs font-medium rounded-zx-sm border border-zx-line text-zx-text-soft hover:bg-zx-surface-2 transition"
            >
              {t('common.notNow')}
            </button>
            <button
              onClick={handleRequestPermission}
              disabled={requestState === 'requesting'}
              className="flex-1 md:flex-0 px-3 py-2 text-xs font-medium rounded-zx-sm bg-zx-accent text-white hover:bg-zx-accent/90 disabled:opacity-60 transition"
            >
              {requestState === 'requesting'
                ? t('common.processing')
                : requestState === 'done'
                  ? t('common.done')
                  : t('notifications.permissionDialog.allowButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
