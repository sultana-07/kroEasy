// firebase-messaging-sw.js
// Background service worker — handles push notifications when the app is not in the foreground.
// This file MUST be at the root of the public directory so its scope covers the entire app.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBA0k8XEUiqwYpL6--htMOCU9BiWL5L8p4',
  authDomain: 'kroeasy-3e160.firebaseapp.com',
  projectId: 'kroeasy-3e160',
  messagingSenderId: '115109277066',
  appId: '1:115109277066:web:841d60a02f2a1e4b392c73',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const notificationTitle = title || 'KroEasy';
  const notificationOptions = {
    body: body || 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Open App' },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// On notification click: focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.link || 'https://kroeasy.com/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('kroeasy.com') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
