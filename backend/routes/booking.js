const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Labour = require('../models/Labour');
const Car = require('../models/Car');
const CarOwner = require('../models/CarOwner');
const { protect } = require('../middleware/auth');
const { sendNotification } = require('../utils/sendNotification');

// POST /api/booking - create booking
router.post('/', protect, async (req, res) => {
    try {
        const { providerId, providerType, carId, notes, latitude, longitude, address, serviceCategory } = req.body;

        // ... self-booking prevention ...
        // (existing logic)

        const bookingData = {
            userId: req.user._id,
            providerType,
            carId,
            notes,
            address,
            serviceCategory,
            bookingType: req.body.bookingType || 'direct',
        };

        if (providerId) bookingData.providerId = providerId;

        if (latitude !== undefined && longitude !== undefined) {
            bookingData.location = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            };
        }

        const booking = await Booking.create(bookingData);

        // Notify provider of a new booking (fire-and-forget)
        try {
            let providerUserId = null;
            if (providerType === 'labour') {
                const labour = await Labour.findById(providerId).select('userId').lean();
                providerUserId = labour?.userId;
            } else if (providerType === 'car') {
                const owner = await CarOwner.findById(providerId).select('userId').lean();
                providerUserId = owner?.userId;
            }
            if (providerUserId) {
                sendNotification(providerUserId, {
                    title: '📬 New Booking Request!',
                    body: `${req.user.name || 'A customer'} has sent you a booking request.`,
                    data: { type: 'new_booking', bookingId: booking._id.toString() },
                }).catch(() => {});
            }
        } catch { /* don't block response */ }

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
        if (!['confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)) {
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
            Booking.findById(req.params.id).lean(),
            profileQuery,
        ]);

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const isProvider = profile && profile._id.toString() === booking.providerId.toString();
        if (!isProvider) return res.status(403).json({ message: 'Not authorized' });

        // Use $set to avoid re-triggering 2dsphere index on docs with partial location
        const updated = await Booking.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        );

        // Notify the customer about the status change (fire-and-forget)
        const statusMessages = {
            confirmed: { title: '✅ Booking Confirmed!', body: 'Your booking request has been confirmed by the provider.' },
            in_progress: { title: '🔧 Work Started!', body: 'Your service provider has started working on your request.' },
            completed: { title: '🎉 Service Completed!', body: 'Your booking has been marked as completed. Please leave a review!' },
            cancelled: { title: '❌ Booking Cancelled', body: 'Your booking has been cancelled by the provider.' },
        };
        const msg = statusMessages[status];
        if (msg) {
            sendNotification(booking.userId, {
                title: msg.title,
                body: msg.body,
                data: { type: 'booking_status', status, bookingId: booking._id.toString() },
            }).catch(() => {});
        }

        // Only increment bookingCount once a job is fully completed
        if (status === 'completed') {
            if (req.user.role === 'labour') {
                Labour.findByIdAndUpdate(profile._id, { $inc: { bookingCount: 1 } }).catch(() => { });
            } else if (req.user.role === 'carowner' && booking.carId) {
                Car.findByIdAndUpdate(booking.carId, { $inc: { bookingCount: 1 } }).catch(() => { });
            }
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/booking/:id/cancel - user cancels their own pending booking
router.patch('/:id/cancel', protect, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).lean();
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (booking.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending bookings can be cancelled' });
        }
        // Use $set to avoid re-triggering 2dsphere index on docs with partial location
        const updated = await Booking.findByIdAndUpdate(
            req.params.id,
            { $set: { status: 'cancelled' } },
            { new: true }
        );
        res.json(updated);
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

        const booking = await Booking.findById(req.params.id).lean();
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

        // Use $set to avoid re-triggering 2dsphere index on docs with partial location
        const updated = await Booking.findByIdAndUpdate(
            req.params.id,
            { $set: { review: { rating, comment, createdAt: new Date() } } },
            { new: true }
        );

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

        // Update car rating when a car booking is reviewed
        if (booking.providerType === 'car' && booking.carId) {
            const Car = require('../models/Car');
            Car.findById(booking.carId)
                .then(car => {
                    if (!car) return;
                    const newTotal = (car.rating || 0) * (car.reviewCount || 0) + rating;
                    const newCount = (car.reviewCount || 0) + 1;
                    return Car.findByIdAndUpdate(booking.carId, {
                        reviewCount: newCount,
                        rating: parseFloat((newTotal / newCount).toFixed(1)),
                    });
                })
                .catch(() => { });
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/booking/broadcast - create a broadcast booking
router.post('/broadcast', protect, async (req, res) => {
    try {
        const { serviceCategory, latitude, longitude, address, notes, broadcastRadius } = req.body;

        if (!serviceCategory || !latitude || !longitude) {
            return res.status(400).json({ message: 'Category and location are required' });
        }

        const booking = await Booking.create({
            userId: req.user._id,
            providerType: 'labour', // currently broadcast only for labour
            providerId: req.user._id, // dummy providerId, will be updated on accept
            status: 'pending',
            bookingType: 'broadcast',
            serviceCategory,
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            address,
            notes,
            broadcastRadius: broadcastRadius || 5,
        });

        // Smart Matching: Notify nearby workers
        const workers = await Labour.find({
            isApproved: true,
            isOnline: true,
            skills: serviceCategory,
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                    $maxDistance: (broadcastRadius || 5) * 1000,
                }
            }
        }).select('userId');

        workers.forEach(worker => {
            sendNotification(worker.userId, {
                title: '📢 New Job Nearby!',
                body: `A new ${serviceCategory} job is available within your area.`,
                data: { type: 'broadcast_booking', bookingId: booking._id.toString() },
            }).catch(() => {});
        });

        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/booking/available - workers fetch broadcast jobs near them
router.get('/available', protect, async (req, res) => {
    try {
        const { lat, lng, radius, category } = req.query;
        const filter = {
            bookingType: 'broadcast',
            status: 'pending',
        };

        if (category) filter.serviceCategory = category;

        if (lat && lng) {
            filter.location = {
                $near: {
                    $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                    $maxDistance: (parseFloat(radius) || 10) * 1000,
                }
            };
        }

        const jobs = await Booking.find(filter)
            .populate('userId', 'name phone city')
            .sort({ createdAt: -1 });

        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/booking/:id/accept-broadcast - worker accepts a broadcast job
router.patch('/:id/accept-broadcast', protect, async (req, res) => {
    try {
        const labourProfile = await Labour.findOne({ userId: req.user._id });
        if (!labourProfile) return res.status(403).json({ message: 'Only workers can accept jobs' });

        const booking = await Booking.findById(req.params.id).lean();
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.bookingType !== 'broadcast') {
            return res.status(400).json({ message: 'Not a broadcast booking' });
        }
        if (booking.status !== 'pending') {
            return res.status(400).json({ message: 'Job already taken or cancelled' });
        }

        // Use $set to avoid re-triggering 2dsphere index on docs with partial location
        const updated = await Booking.findByIdAndUpdate(
            req.params.id,
            { $set: { providerId: labourProfile._id, status: 'confirmed' } },
            { new: true }
        );

        // Notify user
        sendNotification(booking.userId, {
            title: '🎉 Worker Found!',
            body: `${req.user.name} has accepted your job request.`,
            data: { type: 'booking_confirmed', bookingId: booking._id.toString() },
        }).catch(() => {});

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
