const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    providerType: { type: String, enum: ['labour', 'car'], required: true },
    carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending', index: true },
    notes: { type: String },
    review: {
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        createdAt: { type: Date },
    },
}, { timestamps: true });

// Compound index for provider dashboard query
bookingSchema.index({ providerId: 1, createdAt: -1 });
// Compound index for user dashboard query
bookingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
