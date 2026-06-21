// Service Worker for FCM background message handling
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
firebase.initializeApp({
  apiKey: 'AIzaSyDj3WVMpXhTnKZG2qlGQvQOIEoKxLMOT1g',
  authDomain: 'zenx-wealth.firebaseapp.com',
  projectId: 'zenx-wealth',
  storageBucket: 'zenx-wealth.appspot.com',
  messagingSenderId: '1088595281265',
  appId: '1:1088595281265:web:60cd1d0f01968c36a81aa0',
  measurementId: 'G-BHMXWJ8EQT',
});

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icon-192.png',
    badge: '/badge-72.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification clicked:', event.notification);
  event.notification.close();

  const urlToOpen = event.notification.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (let client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.length > 0 && 'navigate' in clients[0]) {
        return clients[0].navigate(urlToOpen).then((c) => c?.focus?.());
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});
