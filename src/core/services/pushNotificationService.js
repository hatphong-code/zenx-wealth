import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebaseApp';

const NOTIFICATION_PREF_KEY = 'push-notifications:enabled';
const FCM_TOKEN_KEY = 'push-notifications:fcm-token';

export class PushNotificationService {
  static async requestPermission() {
    // Check browser support
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.warn('Push notifications not supported in this browser');
      return false;
    }

    // Check if already granted
    if (Notification.permission === 'granted') {
      return true;
    }

    // Skip if previously denied
    if (Notification.permission === 'denied') {
      return false;
    }

    // Request permission
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      return false;
    }
  }

  static async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      return null;
    }
  }

  static async getFCMToken() {
    // Check cache first
    const cached = localStorage.getItem(FCM_TOKEN_KEY);
    if (cached) {
      return cached;
    }

    // Skip if notifications disabled
    if (!this.isNotificationEnabled()) {
      return null;
    }

    try {
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });

      if (token) {
        localStorage.setItem(FCM_TOKEN_KEY, token);
        return token;
      }
    } catch (err) {
      console.error('Failed to get FCM token:', err);
    }

    return null;
  }

  static setupMessageListener(onNotification) {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        console.log('Message received:', payload);

        const { notification, data } = payload;
        if (notification) {
          onNotification({
            title: notification.title,
            body: notification.body,
            icon: notification.icon,
            ...data,
          });
        }
      });
    } catch (err) {
      console.error('Failed to set up message listener:', err);
    }
  }

  static setNotificationEnabled(enabled) {
    localStorage.setItem(NOTIFICATION_PREF_KEY, enabled ? 'true' : 'false');
  }

  static isNotificationEnabled() {
    const pref = localStorage.getItem(NOTIFICATION_PREF_KEY);
    return pref !== 'false'; // Default true if not set
  }

  static clearFCMToken() {
    localStorage.removeItem(FCM_TOKEN_KEY);
  }
}
