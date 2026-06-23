import { useEffect, useState } from 'react';
import { PushNotificationService } from '../../core/services/pushNotificationService';
import { useAuth } from '../../core/auth/useAuth';

export function usePushNotification() {
  const { user } = useAuth();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    if (!user) return;

    const initializePushNotifications = async () => {
      // Check if notifications enabled in user prefs
      const enabled = PushNotificationService.isNotificationEnabled();
      if (!enabled) {
        return;
      }

      // Check browser support
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        return;
      }

      // Check current permission
      const permission = Notification.permission;
      setHasPermission(permission === 'granted');

      if (permission === 'default') {
        // First time — show dialog
        setShowPermissionDialog(true);
      } else if (permission === 'granted') {
        // Already granted — register and get token
        await PushNotificationService.registerServiceWorker();
        const token = await PushNotificationService.getFCMToken();
        if (token) {
          console.log('FCM token obtained:', token);
        }

        // Set up message listener for foreground notifications
        PushNotificationService.setupMessageListener((notification) => {
          console.log('Foreground notification:', notification);
          // Optional: show toast or in-app notification
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.body,
              icon: notification.icon || '/icon-192.png',
            });
          }
        });
      }
    };

    initializePushNotifications();
  }, [user]);

  return {
    showPermissionDialog,
    setShowPermissionDialog,
    hasPermission,
  };
}
