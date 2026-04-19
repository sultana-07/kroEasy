const mongoose = require('mongoose');

// All platform service categories — used for per-city enablement
const ALL_SERVICES = [
    'Electrician', 'Plumber', 'Carpenter', 'Mason',
    'Beautician', 'AC Technician', 'Mehndi Artist', 'Helper',
    'Painter', 'Pest Control', 'CCTV Technician', 'Water Purifier',
    'Home Cleaning', 'Gardener', 'Driver',
];

const areaSchema = new mongoose.Schema({
    name:     { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
}, { _id: false });

const locationSchema = new mongoose.Schema({
    city:     { type: String, required: true, trim: true },
    nameHi:   { type: String, trim: true }, // Hindi translation
    pincode:  { type: String, trim: true },
    // ── Upgraded: each area is {name, isActive} ──────────────────────────
    // Old plain-string areas are migrated automatically on save.
    areas: { type: [areaSchema], default: [] },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
    },
    serviceRadius:   { type: Number, default: 10 }, // KM
    isActive:        { type: Boolean, default: true },
    // Admin-controlled: which services are available in this city
    // Empty array = ALL services enabled (backward compatible)
    enabledServices: { type: [String], default: [] },
}, { timestamps: true });

locationSchema.index({ location: '2dsphere' });
locationSchema.index({ city: 1, pincode: 1 });

module.exports = mongoose.model('Location', locationSchema);
