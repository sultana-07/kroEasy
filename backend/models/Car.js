const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'CarOwner', required: true, index: true },
    carName: { type: String, required: true },
    numberPlate: { type: String, trim: true, uppercase: true, default: '' },
    modelYear: { type: Number },
    priceType: { type: String, enum: ['per_km', 'per_day'], default: 'per_day' },
    basePrice: { type: Number, required: true },
    ac: { type: Boolean, default: false },
    driverIncluded: { type: Boolean, default: false },
    seats: { type: Number },
    carImage: { type: String, default: '' },
    availability: { type: Boolean, default: true, index: true },
    leadCount: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 },
    city: { type: String, index: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

// Compound index for the most common public listing query: available cars by city
carSchema.index({ availability: 1, city: 1 });

module.exports = mongoose.model('Car', carSchema);
