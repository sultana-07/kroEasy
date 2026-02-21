const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    targetType: { type: String, enum: ['labour', 'car'], required: true },
    phone: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('CallLog', callLogSchema);
