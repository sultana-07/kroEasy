const mongoose = require('mongoose');

const carOwnerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    city: { type: String },
    isApproved: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('CarOwner', carOwnerSchema);
