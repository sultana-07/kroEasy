const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    imageUrl: { type: String, required: true },
    link:     { type: String, default: '' },   // optional click-through URL
    order:    { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
