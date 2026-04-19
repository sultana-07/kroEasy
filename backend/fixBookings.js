/**
 * One-time cleanup script:
 * Removes the partial `location: { type: 'Point' }` field from bookings
 * that were created without coordinates. This prevents the 2dsphere index
 * from crashing on those documents.
 *
 * Run once: node fixBookings.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db.collection('bookings').updateMany(
        { 'location.type': 'Point', 'location.coordinates': { $exists: false } },
        { $unset: { location: '' } }
    );

    console.log(`Fixed ${result.modifiedCount} corrupt booking document(s).`);
    await mongoose.disconnect();
    process.exit(0);
}

fix().catch(err => {
    console.error(err);
    process.exit(1);
});
