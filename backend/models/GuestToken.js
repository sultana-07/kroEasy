const mongoose = require('mongoose');

// Stores FCM tokens for users who allowed notifications before registering/logging in.
// Tokens are upserted by device (deduped on token field).
const guestTokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('GuestToken', guestTokenSchema);
