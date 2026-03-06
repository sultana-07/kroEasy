const mongoose = require('mongoose');

const labourSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    skills: [{ type: String }],
    experience: { type: Number, default: 0 },
    charges: { type: String },
    description: { type: String },
    city: { type: String, index: true },
    availability: { type: Boolean, default: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    totalRating: { type: Number, default: 0 },
    profileImage: { type: String, default: '' },
    bookingCount: { type: Number, default: 0 },
    leadCount: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false, index: true },
    profileViews: [{ date: { type: Date, required: true } }],
}, { timestamps: true });

// Compound index for the most common public listing query: approved labours by city
labourSchema.index({ isApproved: 1, city: 1 });
// Compound index for sorting by rating within city
labourSchema.index({ isApproved: 1, city: 1, rating: -1 });

module.exports = mongoose.model('Labour', labourSchema);
