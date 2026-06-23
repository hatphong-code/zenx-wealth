importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD0I0TfzSAkK1Y_5-cJNLQIjQ-R2SbCf7s',
  authDomain: 'zenx-wealth.firebaseapp.com',
  projectId: 'zenx-wealth',
  storageBucket: 'zenx-wealth.firebasestorage.app',
  messagingSenderId: '201162966597',
  appId: '1:201162966597:web:450ec1404293398ef2c52c',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'ZenX Wealth', {
    body: body || '',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
  });
});
