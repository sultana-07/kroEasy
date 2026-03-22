const admin = require('../config/firebase');
const User = require('../models/User');

/**
 * Send a push notification to a specific user by their MongoDB userId.
 * Gracefully skips if the user has no FCM token stored.
 * @param {string|ObjectId} userId
 * @param {{ title: string, body: string, data?: Record<string,string> }} payload
 */
const sendNotification = async (userId, { title, body, data = {} }) => {
    try {
        const user = await User.findById(userId).select('fcmToken').lean();
        if (!user?.fcmToken) return; // user hasn't granted notification permission

        await sendNotificationToToken(user.fcmToken, { title, body, data });
    } catch (err) {
        // Never crash the main flow because of a notification failure
        console.error('sendNotification error:', err.message);
    }
};

/**
 * Send a push notification directly using an FCM token.
 * @param {string} token
 * @param {{ title: string, body: string, data?: Record<string,string> }} payload
 */
const sendNotificationToToken = async (token, { title, body, data = {} }) => {
    try {
        if (!token) return;

        // Ensure all data values are strings (FCM requirement)
        const stringData = {};
        Object.entries(data).forEach(([k, v]) => {
            stringData[k] = String(v);
        });

        const message = {
            token,
            notification: { title, body },
            data: stringData,
            webpush: {
                notification: {
                    title,
                    body,
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-192x192.png',
                    vibrate: [200, 100, 200],
                },
                fcmOptions: {
                    link: 'https://kroeasy.com/dashboard',
                },
            },
        };

        await admin.messaging().send(message);
    } catch (err) {
        // Token may be stale/revoked — log but don't throw
        console.error('sendNotificationToToken error:', err.message);
    }
};

/**
 * Send notification to all admin users.
 */
const notifyAdmins = async ({ title, body, data = {} }) => {
    try {
        const admins = await User.find({ role: 'admin', fcmToken: { $ne: null } }).select('fcmToken').lean();
        await Promise.all(admins.map(a => sendNotificationToToken(a.fcmToken, { title, body, data })));
    } catch (err) {
        console.error('notifyAdmins error:', err.message);
    }
};

module.exports = { sendNotification, sendNotificationToToken, notifyAdmins };
