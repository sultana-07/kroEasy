const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    labourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Labour', required: true, index: true },
    status: {
        type: String,
        enum: ['trial', 'active', 'expired', 'cancelled'],
        default: 'trial',
        index: true,
    },
    plan: { type: String, default: '499_monthly' },
    trialEndsAt: { type: Date, required: true },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },

    // Razorpay integration
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySubscriptionId: { type: String },

    // Payment history
    payments: [{
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        amount: { type: Number }, // in paise
        paidAt: { type: Date },
        status: { type: String, enum: ['success', 'failed'], default: 'success' },
    }],
}, { timestamps: true });

// Compound index for admin queries
subscriptionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
