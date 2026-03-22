// firebase-messaging-sw.template.js
// ⚠️ DO NOT edit firebase-messaging-sw.js directly — it is GENERATED from this template.
// Run `npm run generate-sw` or `npm run build` to regenerate it.
// Placeholders like {{VITE_FIREBASE_API_KEY}} are replaced with real values at build time.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '{{VITE_FIREBASE_API_KEY}}',
  authDomain: '{{VITE_FIREBASE_AUTH_DOMAIN}}',
  projectId: '{{VITE_FIREBASE_PROJECT_ID}}',
  messagingSenderId: '{{VITE_FIREBASE_MESSAGING_SENDER_ID}}',
  appId: '{{VITE_FIREBASE_APP_ID}}',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const notificationTitle = title || 'KroEasy';
  const notificationOptions = {
    body: body || 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [{ action: 'open', title: 'Open App' }],
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.link || 'https://kroeasy.com/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('kroeasy.com') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
