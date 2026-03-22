import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { isSupported } from 'firebase/messaging';
import { app } from '../firebase';
import api from '../api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const LOCAL_FCM_KEY = 'kroeasy_fcm_token';

/**
 * Request notification permission from ANY visitor (logged-in or not).
 * - If logged in → saves FCM token to backend (User.fcmToken)
 * - If NOT logged in → saves to localStorage AND posts to the public guest-fcm-token endpoint
 */
export const requestNotificationPermission = async () => {
  try {
    const supported = await isSupported();
    if (!supported) return;

    if (Notification.permission === 'denied') return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const messaging = getMessaging(app);
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
      // Guest: save to GuestToken collection via public endpoint
      await api.post('/auth/guest-fcm-token', { token }).catch(() => {});
      console.log('🔔 FCM token registered (guest)');
    }

    // Handle foreground messages (app is open / tab active)
    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (!title) return;
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
        });
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
