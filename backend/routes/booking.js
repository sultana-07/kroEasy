const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Labour = require('../models/Labour');
const Car = require('../models/Car');
const CarOwner = require('../models/CarOwner');
const { protect } = require('../middleware/auth');

// POST /api/booking - create booking
router.post('/', protect, async (req, res) => {
    try {
        const { providerId, providerType, carId, notes } = req.body;
        const booking = await Booking.create({
            userId: req.user._id,
            providerId,
            providerType,
            carId,
            notes,
        });

        // Increment booking count — fire-and-forget (don't await; no need to block the response)
        if (providerType === 'labour') {
            Labour.findByIdAndUpdate(providerId, { $inc: { bookingCount: 1 } }).catch(() => { });
        } else if (providerType === 'car') {
            Car.findByIdAndUpdate(carId, { $inc: { bookingCount: 1 } }).catch(() => { });
        }

        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/booking/user - user's bookings (with provider details)
router.get('/user', protect, async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user._id })
            .populate({ path: 'carId', select: 'carName modelYear basePrice priceType ac driverIncluded' })
            .sort({ createdAt: -1 })
            .lean();   // plain JS objects so we can attach extra fields

        if (bookings.length === 0) return res.json([]);

        // Collect provider IDs by type
        const labourIds = bookings.filter(b => b.providerType === 'labour').map(b => b.providerId);
        const carOwnerIds = bookings.filter(b => b.providerType === 'car').map(b => b.providerId);

        // Fetch all needed provider docs in parallel
        const [labours, carOwners] = await Promise.all([
            labourIds.length
                ? Labour.find({ _id: { $in: labourIds } })
                    .populate('userId', 'name phone city')
                    .lean()
                : [],
            carOwnerIds.length
                ? CarOwner.find({ _id: { $in: carOwnerIds } })
                    .populate('userId', 'name phone city')
                    .lean()
                : [],
        ]);

        // Build lookup maps
        const labourMap = Object.fromEntries(labours.map(l => [l._id.toString(), l]));
        const carOwnerMap = Object.fromEntries(carOwners.map(o => [o._id.toString(), o]));

        // Attach provider data to each booking
        const enriched = bookings.map(b => {
            const pid = b.providerId?.toString();
            b.providerDetails = b.providerType === 'labour'
                ? (labourMap[pid] || null)
                : (carOwnerMap[pid] || null);
            return b;
        });

        res.json(enriched);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/booking/provider - provider's bookings
router.get('/provider', protect, async (req, res) => {
    try {
        let profileQuery;
        if (req.user.role === 'labour') {
            profileQuery = Labour.findOne({ userId: req.user._id });
        } else if (req.user.role === 'carowner') {
            profileQuery = CarOwner.findOne({ userId: req.user._id });
        } else {
            return res.json([]);
        }

        const profile = await profileQuery;
        if (!profile) return res.json([]);

        const bookings = await Booking.find({ providerId: profile._id })
            .populate('userId', 'name phone city')
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/booking/:id/status - provider updates booking status
router.patch('/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['confirmed', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // ── Run booking fetch + provider profile lookup in parallel ────────
        let profileQuery;
        if (req.user.role === 'labour') {
            profileQuery = Labour.findOne({ userId: req.user._id });
        } else if (req.user.role === 'carowner') {
            profileQuery = CarOwner.findOne({ userId: req.user._id });
        } else {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const [booking, profile] = await Promise.all([
            Booking.findById(req.params.id),
            profileQuery,
        ]);

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const isProvider = profile && profile._id.toString() === booking.providerId.toString();
        if (!isProvider) return res.status(403).json({ message: 'Not authorized' });

        booking.status = status;
        await booking.save();
        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/booking/:id/review - user submits review after completion
router.post('/:id/review', protect, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (booking.status !== 'completed') {
            return res.status(400).json({ message: 'Can only review completed bookings' });
        }
        if (booking.review?.rating) {
            return res.status(400).json({ message: 'Already reviewed' });
        }

        booking.review = { rating, comment, createdAt: new Date() };
        await booking.save();

        // Update provider avg rating (fire-and-forget — don't block the response)
        if (booking.providerType === 'labour') {
            Labour.findById(booking.providerId)
                .then(labour => {
                    if (!labour) return;
                    const newTotal = (labour.totalRating || 0) + rating;
                    const newCount = (labour.reviewCount || 0) + 1;
                    return Labour.findByIdAndUpdate(booking.providerId, {
                        totalRating: newTotal,
                        reviewCount: newCount,
                        rating: parseFloat((newTotal / newCount).toFixed(1)),
                    });
                })
                .catch(() => { });
        }

        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
