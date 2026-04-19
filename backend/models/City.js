const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    areas: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
}, { timestamps: true });

citySchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('City', citySchema);
