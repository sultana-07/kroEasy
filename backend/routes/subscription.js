const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Labour = require('../models/Labour');
const { protect, authorize } = require('../middleware/auth');

const TRIAL_DAYS = 90;           // 3 months free
const PLAN_AMOUNT = 49900;       // ₹499 in paise
const PLAN_AMOUNT_INR = 499;

// ── Helper: get or compute subscription status ──────────────────────────────
const computeStatus = (sub) => {
    if (!sub) return null;
    const now = new Date();
    if (sub.status === 'trial' && now > sub.trialEndsAt) return 'expired';
    if (sub.status === 'active' && sub.currentPeriodEnd && now > sub.currentPeriodEnd) return 'expired';
    return sub.status;
};

// GET /api/subscription/status — own subscription status
router.get('/status', protect, authorize('labour'), async (req, res) => {
    try {
        const sub = await Subscription.findOne({ userId: req.user._id }).lean();
        if (!sub) return res.json({ status: 'none', trialEndsAt: null, daysLeft: 0 });

        const effectiveStatus = computeStatus(sub);

        let daysLeft = 0;
        const now = new Date();
        if (effectiveStatus === 'trial') {
            daysLeft = Math.max(0, Math.ceil((new Date(sub.trialEndsAt) - now) / 86400000));
        } else if (effectiveStatus === 'active' && sub.currentPeriodEnd) {
            daysLeft = Math.max(0, Math.ceil((new Date(sub.currentPeriodEnd) - now) / 86400000));
        }

        // Auto-update DB if status drifted
        if (effectiveStatus !== sub.status) {
            Subscription.findByIdAndUpdate(sub._id, { status: effectiveStatus }).catch(() => {});
        }

        res.json({
            ...sub,
            status: effectiveStatus,
            daysLeft,
            planAmount: PLAN_AMOUNT_INR,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/subscription/create-order — Razorpay order creation
router.post('/create-order', protect, authorize('labour'), async (req, res) => {
    try {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const order = await razorpay.orders.create({
            amount: PLAN_AMOUNT,
            currency: 'INR',
            receipt: `sub_${req.user._id}_${Date.now()}`,
            notes: {
                userId: req.user._id.toString(),
                plan: '499_monthly',
            },
        });

        // Store the pending order id on the subscription
        await Subscription.findOneAndUpdate(
            { userId: req.user._id },
            { razorpayOrderId: order.id },
            { upsert: false }
        );

        res.json({ orderId: order.id, amount: PLAN_AMOUNT, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
        console.error('Razorpay order error:', err.message);
        res.status(500).json({ message: err.message || 'Payment gateway error' });
    }
});

// POST /api/subscription/verify-payment — verify + activate subscription
router.post('/verify-payment', protect, authorize('labour'), async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing payment fields' });
        }

        // Verify signature
        const crypto = require('crypto');
        const generated = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generated !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment signature mismatch. Possible fraud attempt.' });
        }

        // Activate subscription for 30 days
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);

        const sub = await Subscription.findOneAndUpdate(
            { userId: req.user._id },
            {
                status: 'active',
                razorpayPaymentId: razorpay_payment_id,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                $push: {
                    payments: {
                        razorpayOrderId: razorpay_order_id,
                        razorpayPaymentId: razorpay_payment_id,
                        amount: PLAN_AMOUNT,
                        paidAt: now,
                        status: 'success',
                    },
                },
            },
            { new: true }
        );

        res.json({ message: 'Payment verified. Subscription activated!', subscription: sub });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/subscription/admin/all — admin: list all subscriptions with worker info
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 30);
        const skip = (page - 1) * limit;
        const { status } = req.query;

        const filter = {};
        if (status && status !== 'all') filter.status = status;

        const [subs, total] = await Promise.all([
            Subscription.find(filter)
                .populate('userId', 'name phone city')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Subscription.countDocuments(filter),
        ]);

        // Compute effective status & days left for each
        const now = new Date();
        const enriched = subs.map(s => {
            const effectiveStatus = computeStatus(s);
            let daysLeft = 0;
            if (effectiveStatus === 'trial') {
                daysLeft = Math.max(0, Math.ceil((new Date(s.trialEndsAt) - now) / 86400000));
            } else if (effectiveStatus === 'active' && s.currentPeriodEnd) {
                daysLeft = Math.max(0, Math.ceil((new Date(s.currentPeriodEnd) - now) / 86400000));
            }
            return { ...s, status: effectiveStatus, daysLeft };
        });

        // Revenue stats
        const [totalRevenue, activeCount, trialCount, expiredCount] = await Promise.all([
            Subscription.aggregate([
                { $unwind: '$payments' },
                { $match: { 'payments.status': 'success' } },
                { $group: { _id: null, total: { $sum: '$payments.amount' } } },
            ]),
            Subscription.countDocuments({ status: 'active' }),
            Subscription.countDocuments({ status: 'trial' }),
            Subscription.countDocuments({ status: 'expired' }),
        ]);

        res.json({
            data: enriched,
            total,
            page,
            pages: Math.ceil(total / limit),
            stats: {
                totalRevenue: (totalRevenue[0]?.total || 0) / 100,
                activeCount,
                trialCount,
                expiredCount,
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/subscription/admin/:id/override — admin: manually extend or cancel
router.patch('/admin/:id/override', protect, authorize('admin'), async (req, res) => {
    try {
        const { action, days } = req.body; // action: 'extend' | 'cancel' | 'activate'
        const sub = await Subscription.findById(req.params.id);
        if (!sub) return res.status(404).json({ message: 'Subscription not found' });

        if (action === 'cancel') {
            sub.status = 'cancelled';
        } else if (action === 'activate') {
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setDate(periodEnd.getDate() + (days || 30));
            sub.status = 'active';
            sub.currentPeriodStart = now;
            sub.currentPeriodEnd = periodEnd;
        } else if (action === 'extend' && days) {
            const base = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : new Date();
            base.setDate(base.getDate() + days);
            sub.currentPeriodEnd = base;
            if (sub.status !== 'active') sub.status = 'active';
        } else if (action === 'trial') {
            const newEnd = new Date();
            newEnd.setDate(newEnd.getDate() + (days || 30));
            sub.trialEndsAt = newEnd;
            sub.status = 'trial';
        }

        await sub.save();
        res.json(sub);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
