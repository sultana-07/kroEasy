const admin = require('firebase-admin');

// Only initialize once
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('🔔 Firebase Admin initialized');
    } catch (err) {
        console.warn('⚠️  Firebase Admin not initialized (missing or invalid FIREBASE_SERVICE_ACCOUNT):', err.message);
    }
}

module.exports = admin;
