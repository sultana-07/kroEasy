import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { isSupported } from 'firebase/messaging';
import { app } from '../firebase';
import api from '../api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const LOCAL_FCM_KEY = 'kroeasy_fcm_token';

/**
 * Request notification permission from ANY visitor (logged-in or not).
 * Works for:
 *  - PWA installed users
 *  - Regular browser tab users (non-PWA)
 *  - Logged-in users (saves to User.fcmToken)
 *  - Guests / not logged in (saves to GuestToken collection)
 *
 * Firebase SDK automatically finds /firebase-messaging-sw.js — no manual SW
 * registration needed here (which would conflict with the Workbox SW).
 */
export const requestNotificationPermission = async () => {
  try {
    const supported = await isSupported();
    if (!supported) return;

    if (Notification.permission === 'denied') return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const messaging = getMessaging(app);

    // Firebase SDK auto-discovers /firebase-messaging-sw.js at the root.
    // Do NOT pass serviceWorkerRegistration here to avoid SW conflicts with Workbox.
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return;

    // Always cache locally
    localStorage.setItem(LOCAL_FCM_KEY, token);

    const authToken = localStorage.getItem('kroeasy_token');
    if (authToken) {
      // Logged-in: save to User document
      await api.post('/auth/fcm-token', { token }).catch(() => {});
      console.log('🔔 FCM token registered (logged in)');
    } else {
      // Guest / non-PWA: save to GuestToken collection via public endpoint
      await api.post('/auth/guest-fcm-token', { token }).catch(() => {});
      console.log('🔔 FCM token registered (guest)');
    }

    // Handle foreground messages (app is open / tab active)
    // Use SW showNotification() so it works in both PWA and regular browser mode on Android
    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (!title || Notification.permission !== 'granted') return;

      // Prefer SW-based notification (works in PWA standalone mode on Android)
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.ready
          .then(reg => reg.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            vibrate: [200, 100, 200],
          }))
          .catch(() => {
            // Fallback for desktop browsers when SW showNotification fails
            new Notification(title, { body, icon: '/pwa-192x192.png' });
          });
      } else {
        // Desktop browser / no SW controller yet
        new Notification(title, { body, icon: '/pwa-192x192.png' });
      }
    });
  } catch (err) {
    console.warn('Notification setup failed:', err.message);
  }
};

/**
 * Called after login — syncs any locally saved FCM token to the backend.
 * Also removes the token from the GuestToken collection (handled server-side).
 */
export const syncFcmTokenAfterLogin = async () => {
  try {
    const token = localStorage.getItem(LOCAL_FCM_KEY);
    if (!token) return;
    const authToken = localStorage.getItem('kroeasy_token');
    if (!authToken) return;
    await api.post('/auth/fcm-token', { token });
    console.log('🔔 FCM token synced to backend after login');
  } catch (err) {
    console.warn('FCM token sync failed:', err.message);
  }
};
