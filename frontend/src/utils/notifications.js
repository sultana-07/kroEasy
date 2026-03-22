import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { isSupported } from 'firebase/messaging';
import { app } from '../firebase';
import api from '../api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Request notification permission and register the FCM token with our backend.
 * Safe to call on every login — skips silently if already granted or browser doesn't support it.
 */
export const requestNotificationPermission = async () => {
  try {
    // Check browser support
    const supported = await isSupported();
    if (!supported) return;

    // Don't re-prompt if already denied
    if (Notification.permission === 'denied') return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return;

    // Save token to backend (silently — don't block the login flow)
    await api.post('/auth/fcm-token', { token });
    console.log('🔔 FCM token registered');

    // Handle foreground messages (app is open)
    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (!title) return;

      // Use the Notifications API directly to show a toast-style notification
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
        });
      }
    });
  } catch (err) {
    // Notification setup should never break the app
    console.warn('Notification setup failed:', err.message);
  }
};
