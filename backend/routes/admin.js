const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Labour = require('../models/Labour');
const CarOwner = require('../models/CarOwner');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const CallLog = require('../models/CallLog');
const PwaInstall = require('../models/PwaInstall');
const GuestToken = require('../models/GuestToken');
const Banner = require('../models/Banner');
const Location = require('../models/Location');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');


// Helper: parse pagination query params
const paginate = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(query.limit) || 50));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

router.get('/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const [users, labours, carOwners, cars, bookings, callLogs, pwaInstalls, notifUsers, notifGuests] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            Labour.countDocuments(),
            CarOwner.countDocuments(),
            Car.countDocuments(),
            Booking.countDocuments(),
            CallLog.countDocuments(),
            PwaInstall.countDocuments(),
            User.countDocuments({ fcmToken: { $ne: null } }),
            GuestToken.countDocuments(),
        ]);
        res.json({ users, labours, carOwners, cars, bookings, callLogs, pwaInstalls,
                   notifSubscribers: notifUsers + notifGuests, notifUsers, notifGuests });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/activity - enriched bookings + call logs
router.get('/activity', protect, authorize('admin'), async (req, res) => {
    try {
        const [recentBookings, recentCallLogs] = await Promise.all([
            Booking.find()
                .populate('userId', 'name phone city')
                .populate('carId', 'carName modelYear basePrice')
                .sort({ createdAt: -1 })
                .limit(30)
                .lean(),
            CallLog.find()
                .populate('userId', 'name phone')
                .sort({ createdAt: -1 })
                .limit(30)
                .lean(),
        ]);

        // ── Enrich booking provider details ─────────────────────────────────
        const labourBookingIds = recentBookings.filter(b => b.providerType === 'labour').map(b => b.providerId);
        const carOwnerBookingIds = recentBookings.filter(b => b.providerType === 'car').map(b => b.providerId);
        const [labourProviders, carOwnerProviders] = await Promise.all([
            Labour.find({ _id: { $in: labourBookingIds } }).populate('userId', 'name phone city').lean(),
            CarOwner.find({ _id: { $in: carOwnerBookingIds } }).populate('userId', 'name phone city').lean(),
        ]);
        const labourMap = Object.fromEntries(labourProviders.map(l => [l._id.toString(), l]));
        const carOwnerMap = Object.fromEntries(carOwnerProviders.map(o => [o._id.toString(), o]));

        const enrichedBookings = recentBookings.map(b => {
            let providerDetails = null;
            if (b.providerType === 'labour') providerDetails = labourMap[b.providerId?.toString()];
            else if (b.providerType === 'car') providerDetails = carOwnerMap[b.providerId?.toString()];
            return { ...b, providerDetails };
        });

        // ── Enrich call log target details ────────────────────────────────────
        const labourCallIds = recentCallLogs.filter(c => c.targetType === 'labour').map(c => c.targetId);
        const carCallIds = recentCallLogs.filter(c => c.targetType === 'car').map(c => c.targetId);
        const [labourTargets, carTargets] = await Promise.all([
            Labour.find({ _id: { $in: labourCallIds } }).populate('userId', 'name phone city').lean(),
            Car.find({ _id: { $in: carCallIds } }).lean(),
        ]);
        const labourTargetMap = Object.fromEntries(labourTargets.map(l => [l._id.toString(), l]));
        const carTargetMap = Object.fromEntries(carTargets.map(c => [c._id.toString(), c]));

        const enrichedCallLogs = recentCallLogs.map(c => {
            let targetDetails = null;
            if (c.targetType === 'labour') targetDetails = labourTargetMap[c.targetId?.toString()];
            else if (c.targetType === 'car') targetDetails = carTargetMap[c.targetId?.toString()];
            return { ...c, targetDetails };
        });

        res.json({ recentBookings: enrichedBookings, recentCallLogs: enrichedCallLogs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/users - all users with pagination
router.get('/users', protect, authorize('admin'), async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const [users, total] = await Promise.all([
            User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
            User.countDocuments(),
        ]);
        res.json({ data: users, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/labours - all labours with pagination
router.get('/labours', protect, authorize('admin'), async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const [labours, total] = await Promise.all([
            Labour.find().populate('userId', 'name phone city').sort({ createdAt: -1 }).skip(skip).limit(limit),
            Labour.countDocuments(),
        ]);
        res.json({ data: labours, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/carowners - all car owners with pagination
router.get('/carowners', protect, authorize('admin'), async (req, res) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const [owners, total] = await Promise.all([
            CarOwner.find().populate('userId', 'name phone city').sort({ createdAt: -1 }).skip(skip).limit(limit),
            CarOwner.countDocuments(),
        ]);
        res.json({ data: owners, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/all-cars - all cars (for admin booking count controls)
router.get('/all-cars', protect, authorize('admin'), async (req, res) => {
    try {
        const cars = await Car.find().select('carName modelYear ownerId bookingCount').sort({ createdAt: -1 }).lean();
        res.json(cars);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/admin/approve-labour/:id
router.patch('/approve-labour/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { isApproved } = req.body;
        const labour = await Labour.findByIdAndUpdate(req.params.id, { isApproved }, { new: true });
        res.json(labour);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/admin/approve-carowner/:id
router.patch('/approve-carowner/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { isApproved } = req.body;
        const owner = await CarOwner.findByIdAndUpdate(req.params.id, { isApproved }, { new: true });
        res.json(owner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/admin/suspend-user/:id
router.patch('/suspend-user/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { isSuspended } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { isSuspended }, { new: true }).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/provider-stats — weekly & monthly bookings+calls per provider
router.get('/provider-stats', protect, authorize('admin'), async (req, res) => {
    try {
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Aggregate bookings grouped by providerId for the last week and month
        const [weekBookings, monthBookings, weekCalls, monthCalls, totalBookingsAgg, completedBookingsAgg, todayCalls] = await Promise.all([
            Booking.aggregate([
                { $match: { createdAt: { $gte: weekAgo } } },
                { $group: { _id: '$providerId', count: { $sum: 1 } } },
            ]),
            Booking.aggregate([
                { $match: { createdAt: { $gte: monthAgo } } },
                { $group: { _id: '$providerId', count: { $sum: 1 } } },
            ]),
            CallLog.aggregate([
                { $match: { createdAt: { $gte: weekAgo } } },
                { $group: { _id: '$targetId', targetType: { $first: '$targetType' }, count: { $sum: 1 } } },
            ]),
            CallLog.aggregate([
                { $match: { createdAt: { $gte: monthAgo } } },
                { $group: { _id: '$targetId', targetType: { $first: '$targetType' }, count: { $sum: 1 } } },
            ]),
            Booking.aggregate([
                { $group: { _id: '$providerId', count: { $sum: 1 } } },
            ]),
            Booking.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: '$providerId', count: { $sum: 1 } } },
            ]),
            CallLog.aggregate([
                { $match: { createdAt: { $gte: todayStart } } },
                { $group: { _id: '$targetId', targetType: { $first: '$targetType' }, count: { $sum: 1 } } },
            ]),
        ]);

        // Build lookup maps: providerId -> count
        const toMap = arr => Object.fromEntries(arr.map(x => [x._id?.toString(), x.count]));
        const weekBookMap = toMap(weekBookings);
        const monthBookMap = toMap(monthBookings);
        const weekCallMap = toMap(weekCalls.filter(x => x.targetType === 'labour'));
        const monthCallMap = toMap(monthCalls.filter(x => x.targetType === 'labour'));
        const weekCarCallMap = toMap(weekCalls.filter(x => x.targetType === 'car'));
        const monthCarCallMap = toMap(monthCalls.filter(x => x.targetType === 'car'));
        const totalBookMap = toMap(totalBookingsAgg);
        const completedBookMap = toMap(completedBookingsAgg);
        const todayCallMap = toMap(todayCalls.filter(x => x.targetType === 'labour'));
        const todayCarCallMap = toMap(todayCalls.filter(x => x.targetType === 'car'));

        // Get all labours and carowners with userId populated
        // Also get all cars so we can map carId -> ownerId for call log matching
        const [labours, carOwners, allCars] = await Promise.all([
            Labour.find().populate('userId', 'name phone city').lean(),
            CarOwner.find().populate('userId', 'name phone city').lean(),
            Car.find().select('ownerId bookingCount').lean(),
        ]);

        // Build reverse map: carId (string) -> carOwnerId (string)
        const carToOwnerMap = {};
        allCars.forEach(car => {
            carToOwnerMap[car._id.toString()] = car.ownerId?.toString();
        });

        // Helper: sum call counts for an owner across all their cars
        const sumCarCalls = (callMap, ownerId) => {
            let total = 0;
            allCars
                .filter(car => car.ownerId?.toString() === ownerId)
                .forEach(car => {
                    total += callMap[car._id.toString()] || 0;
                });
            return total;
        };

        const labourStats = labours.map(l => {
            const views = l.profileViews || [];
            return {
                _id: l._id,
                name: l.userId?.name,
                phone: l.userId?.phone,
                city: l.userId?.city,
                skills: l.skills,
                isApproved: l.isApproved,
                weekBookings: weekBookMap[l._id.toString()] || 0,
                monthBookings: monthBookMap[l._id.toString()] || 0,
                totalBookings: totalBookMap[l._id.toString()] || 0,
                completedBookings: completedBookMap[l._id.toString()] || 0,
                todayCalls: todayCallMap[l._id.toString()] || 0,
                weekCalls: weekCallMap[l._id.toString()] || 0,
                monthCalls: monthCallMap[l._id.toString()] || 0,
                totalViews: views.length,
                todayViews: views.filter(v => new Date(v.date) >= todayStart).length,
                weekViews: views.filter(v => new Date(v.date) >= weekAgo).length,
                monthViews: views.filter(v => new Date(v.date) >= monthAgo).length,
            };
        });

        // Build call count maps keyed by car._id for car-type logs
        const todayCarCallMapByCar = toMap(todayCalls.filter(x => x.targetType === 'car'));
        const weekCarCallMapByCar = toMap(weekCalls.filter(x => x.targetType === 'car'));
        const monthCarCallMapByCar = toMap(monthCalls.filter(x => x.targetType === 'car'));

        const carOwnerStats = carOwners.map(o => {
            const views = o.profileViews || [];
            // Sum bookingCount across all cars belonging to this owner
            const ownerCars = allCars.filter(c => c.ownerId?.toString() === o._id.toString());
            const totalCarBookings = ownerCars.reduce((sum, c) => sum + (c.bookingCount || 0), 0);
            return {
                _id: o._id,
                name: o.userId?.name,
                phone: o.userId?.phone,
                city: o.userId?.city,
                isApproved: o.isApproved,
                weekBookings: weekBookMap[o._id.toString()] || 0,
                monthBookings: monthBookMap[o._id.toString()] || 0,
                totalBookings: totalBookMap[o._id.toString()] || 0,
                completedBookings: completedBookMap[o._id.toString()] || 0,
                todayCalls: sumCarCalls(todayCarCallMapByCar, o._id.toString()),
                weekCalls: sumCarCalls(weekCarCallMapByCar, o._id.toString()),
                monthCalls: sumCarCalls(monthCarCallMapByCar, o._id.toString()),
                totalViews: views.length,
                todayViews: views.filter(v => new Date(v.date) >= todayStart).length,
                weekViews: views.filter(v => new Date(v.date) >= weekAgo).length,
                monthViews: views.filter(v => new Date(v.date) >= monthAgo).length,
            };
        });

        res.json({ labourStats, carOwnerStats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/password-resets — list all pending (non-expired) reset requests
router.get('/password-resets', protect, authorize('admin'), async (req, res) => {
    try {
        const requests = await User.find({
            resetPasswordToken: { $ne: null },
            resetPasswordExpiry: { $gt: new Date() },
        }).select('name phone resetPasswordToken resetPasswordExpiry').sort({ resetPasswordExpiry: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/admin/delete-user/:id — permanently remove a regular user
router.delete('/delete-user/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/admin/delete-labour/:id — remove a service provider + their User account
router.delete('/delete-labour/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const labour = await Labour.findById(req.params.id);
        if (!labour) return res.status(404).json({ message: 'Provider not found' });
        // Delete the linked User account too
        await User.findByIdAndDelete(labour.userId);
        await Labour.findByIdAndDelete(req.params.id);
        res.json({ message: 'Provider and user account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/admin/delete-carowner/:id — remove a car owner + their cars + their User account
router.delete('/delete-carowner/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const owner = await CarOwner.findById(req.params.id);
        if (!owner) return res.status(404).json({ message: 'Car owner not found' });
        // Also delete all cars belonging to this owner
        await Car.deleteMany({ ownerId: req.params.id });
        await User.findByIdAndDelete(owner.userId);
        await CarOwner.findByIdAndDelete(req.params.id);
        res.json({ message: 'Car owner, their cars, and user account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/admin/labour-booking-count/:id — manually adjust a labour's bookingCount
router.patch('/labour-booking-count/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { delta } = req.body;
        if (delta !== 1 && delta !== -1) {
            return res.status(400).json({ message: 'delta must be 1 or -1' });
        }

        // Prevent going below 0: if decrementing, only allow if current count > 0
        const labour = await Labour.findById(req.params.id).select('bookingCount').lean();
        if (!labour) return res.status(404).json({ message: 'Labour not found' });
        if (delta === -1 && (labour.bookingCount || 0) <= 0) {
            return res.status(400).json({ message: 'Booking count is already 0' });
        }

        const updated = await Labour.findByIdAndUpdate(
            req.params.id,
            { $inc: { bookingCount: delta } },
            { new: true }
        );
        res.json({ bookingCount: updated.bookingCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/admin/car-booking-count/:carId — manually adjust a car's bookingCount
router.patch('/car-booking-count/:carId', protect, authorize('admin'), async (req, res) => {
    try {
        const { delta } = req.body;
        if (delta !== 1 && delta !== -1) {
            return res.status(400).json({ message: 'delta must be 1 or -1' });
        }

        const car = await Car.findById(req.params.carId).select('bookingCount').lean();
        if (!car) return res.status(404).json({ message: 'Car not found' });
        if (delta === -1 && (car.bookingCount || 0) <= 0) {
            return res.status(400).json({ message: 'Booking count is already 0' });
        }

        const updated = await Car.findByIdAndUpdate(
            req.params.carId,
            { $inc: { bookingCount: delta } },
            { new: true }
        );
        res.json({ bookingCount: updated.bookingCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/admin/broadcast-notification — send push to all users (or filtered by role)
router.post('/broadcast-notification', protect, authorize('admin'), async (req, res) => {
    try {
        const { title, body, role } = req.body;
        if (!title || !body) return res.status(400).json({ message: 'title and body are required' });

        const admin = require('../config/firebase');
        const GuestToken = require('../models/GuestToken');

        // Build registered user query
        const query = { fcmToken: { $exists: true, $ne: null, $ne: '' } };
        if (role && role !== 'all') query.role = role;

        const [users, guestTokens] = await Promise.all([
            User.find(query).select('fcmToken').lean(),
            (!role || role === 'all') ? GuestToken.find({ token: { $exists: true, $ne: '', $ne: null } }).select('token').lean() : [],
        ]);

        const allTokens = [
            ...users.map(u => u.fcmToken),
            ...guestTokens.map(g => g.token),
        ].filter(t => typeof t === 'string' && t.trim().length > 0);

        if (allTokens.length === 0) return res.json({ sent: 0, failed: 0, message: 'No devices with notifications enabled' });

        const stringData = { link: 'https://kroeasy.com/' };

        // FCM multicast supports max 500 tokens per call — chunk accordingly
        const CHUNK_SIZE = 500;
        const staleTokens = [];
        let totalSent = 0;
        let totalFailed = 0;

        for (let i = 0; i < allTokens.length; i += CHUNK_SIZE) {
            const chunk = allTokens.slice(i, i + CHUNK_SIZE);
            const multicastMessage = {
                tokens: chunk,
                notification: { title, body },
                data: stringData,
                webpush: {
                    notification: {
                        title,
                        body,
                        icon: '/pwa-192x192.png',
                        badge: '/pwa-192x192.png',
                        vibrate: [200, 100, 200],
                        data: stringData,
                    },
                    fcmOptions: { link: stringData.link },
                },
            };

            try {
                const batchResponse = await admin.messaging().sendEachForMulticast(multicastMessage);
                totalSent += batchResponse.successCount;
                totalFailed += batchResponse.failureCount;

                // Collect stale tokens to clean up
                batchResponse.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const code = resp.error?.code || '';
                        if (
                            code.includes('registration-token-not-registered') ||
                            code.includes('invalid-registration-token') ||
                            code.includes('NotRegistered')
                        ) {
                            staleTokens.push(chunk[idx]);
                        }
                    }
                });
            } catch (batchErr) {
                console.error('Batch send error:', batchErr.message);
                totalFailed += chunk.length;
            }
        }

        // Clean up stale tokens in bulk (fire-and-forget, don't block response)
        if (staleTokens.length > 0) {
            Promise.all([
                User.updateMany({ fcmToken: { $in: staleTokens } }, { $unset: { fcmToken: '' } }),
                GuestToken.deleteMany({ token: { $in: staleTokens } }),
            ]).catch(e => console.error('Stale token cleanup error:', e.message));
        }

        res.json({
            sent: totalSent,
            failed: totalFailed,
            staleRemoved: staleTokens.length,
            message: `✅ Sent to ${totalSent} device(s). Failed: ${totalFailed}. Cleaned ${staleTokens.length} expired tokens.`,
        });
    } catch (error) {
        console.error('broadcast-notification error:', error);
        res.status(500).json({ message: error.message });
    }
});


// GET /api/admin/city-partners — list all city partner accounts
router.get('/city-partners', protect, authorize('admin'), async (req, res) => {
    try {
        const partners = await User.find({ role: 'citypartner' })
            .select('-password -resetPasswordToken -resetPasswordExpiry')
            .sort({ createdAt: -1 });
        res.json(partners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/admin/city-partners — create a new city partner account
router.post('/city-partners', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, phone, password, city } = req.body;
        if (!name || !phone || !password || !city) {
            return res.status(400).json({ message: 'name, phone, password and city are all required' });
        }
        const existing = await User.findOne({ phone });
        if (existing) return res.status(400).json({ message: 'Phone number already registered' });

        const partner = await User.create({ name, phone, password, role: 'citypartner', city });
        res.status(201).json({
            _id: partner._id,
            name: partner.name,
            phone: partner.phone,
            role: partner.role,
            city: partner.city,
            createdAt: partner.createdAt,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/admin/city-partners/:id — remove a city partner
router.delete('/city-partners/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const partner = await User.findOne({ _id: req.params.id, role: 'citypartner' });
        if (!partner) return res.status(404).json({ message: 'City partner not found' });
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'City partner deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/city-partners/:id/stats — full stats for one city partner
router.get('/city-partners/:id/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const partner = await User.findOne({ _id: req.params.id, role: 'citypartner' })
            .select('-password -resetPasswordToken -resetPasswordExpiry')
            .lean();
        if (!partner) return res.status(404).json({ message: 'City partner not found' });

        const cityRegex = { $regex: partner.city, $options: 'i' };

        const [
            totalLabours,
            approvedLabours,
            totalCarOwners,
            approvedCarOwners,
            cityLabourDocs,
            cityCarOwnerDocs,
        ] = await Promise.all([
            Labour.countDocuments({ city: cityRegex }),
            Labour.countDocuments({ city: cityRegex, isApproved: true }),
            CarOwner.countDocuments({ city: cityRegex }),
            CarOwner.countDocuments({ city: cityRegex, isApproved: true }),
            Labour.find({ city: cityRegex }).select('_id').lean(),
            CarOwner.find({ city: cityRegex }).select('_id').lean(),
        ]);

        const labourIds = cityLabourDocs.map(l => l._id);
        const carOwnerIds = cityCarOwnerDocs.map(o => o._id);

        const bookingFilter = {
            $or: [
                { providerType: 'labour', providerId: { $in: labourIds } },
                { providerType: 'car', providerId: { $in: carOwnerIds } },
            ],
        };

        const [
            totalBookings,
            pendingBookings,
            confirmedBookings,
            completedBookings,
            cancelledBookings,
            recentBookings,
        ] = await Promise.all([
            Booking.countDocuments(bookingFilter),
            Booking.countDocuments({ ...bookingFilter, status: 'pending' }),
            Booking.countDocuments({ ...bookingFilter, status: 'confirmed' }),
            Booking.countDocuments({ ...bookingFilter, status: 'completed' }),
            Booking.countDocuments({ ...bookingFilter, status: 'cancelled' }),
            Booking.find(bookingFilter)
                .populate('userId', 'name phone city')
                .populate('carId', 'carName modelYear basePrice priceType')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
        ]);

        // Enrich recent bookings with provider details
        const recentLabourIds = recentBookings.filter(b => b.providerType === 'labour').map(b => b.providerId);
        const recentCarOwnerIds = recentBookings.filter(b => b.providerType === 'car').map(b => b.providerId);

        const [labourProviders, carOwnerProviders] = await Promise.all([
            Labour.find({ _id: { $in: recentLabourIds } })
                .populate('userId', 'name phone')
                .select('skills charges userId')
                .lean(),
            CarOwner.find({ _id: { $in: recentCarOwnerIds } })
                .populate('userId', 'name phone')
                .lean(),
        ]);

        const labourMap = Object.fromEntries(labourProviders.map(l => [l._id.toString(), l]));
        const carOwnerMap = Object.fromEntries(carOwnerProviders.map(o => [o._id.toString(), o]));

        const enrichedBookings = recentBookings.map(b => {
            const providerDetails = b.providerType === 'labour'
                ? labourMap[b.providerId?.toString()]
                : carOwnerMap[b.providerId?.toString()];
            return { ...b, providerDetails };
        });

        // Get recent workers & car owners (last 5 pending)
        const [pendingWorkers, pendingOwners] = await Promise.all([
            Labour.find({ city: cityRegex, isApproved: false })
                .populate('userId', 'name phone')
                .select('skills charges city userId isApproved createdAt')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            CarOwner.find({ city: cityRegex, isApproved: false })
                .populate('userId', 'name phone')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
        ]);

        res.json({
            partner,
            stats: {
                totalLabours,
                approvedLabours,
                pendingLabours: totalLabours - approvedLabours,
                totalCarOwners,
                approvedCarOwners,
                pendingCarOwners: totalCarOwners - approvedCarOwners,
                totalBookings,
                pendingBookings,
                confirmedBookings,
                completedBookings,
                cancelledBookings,
            },
            recentBookings: enrichedBookings,
            pendingWorkers,
            pendingOwners,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// ─── Banner routes ─────────────────────────────────────────────────────────

// GET /api/banners — public: get all active banners sorted by order
router.get('/banners', async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
        res.json(banners);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/banners — admin: get ALL banners (including inactive)
router.get('/admin-banners', protect, authorize('admin'), async (req, res) => {
    try {
        const banners = await Banner.find().sort({ order: 1, createdAt: 1 });
        res.json(banners);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/admin/banners — admin: upload a new banner image
router.post('/admin-banners', protect, authorize('admin'), upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Image file is required' });
        const count = await Banner.countDocuments();
        const banner = await Banner.create({
            imageUrl: req.file.path,  // Cloudinary URL
            link: req.body.link || '',
            order: count,
        });
        res.status(201).json(banner);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/admin/banners/:id — admin: remove a banner
router.delete('/admin-banners/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await Banner.findByIdAndDelete(req.params.id);
        res.json({ message: 'Banner deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/admin/banners/:id — admin: toggle active / update order
router.patch('/admin-banners/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!banner) return res.status(404).json({ message: 'Banner not found' });
        res.json(banner);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Location routes ────────────────────────────────────────────────────────
// GET /api/admin/locations - get all locations
router.get('/locations', protect, authorize('admin'), async (req, res) => {
    try {
        const locations = await Location.find().sort({ city: 1 });
        res.json(locations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Helper: normalize areas to [{name, isActive}] objects
function normalizeAreas(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(a => {
        if (typeof a === 'string') return { name: a.trim(), isActive: true };
        return { name: (a.name || '').trim(), isActive: a.isActive !== false };
    }).filter(a => a.name);
}

// POST /api/admin/locations - add new location
router.post('/locations', protect, authorize('admin'), async (req, res) => {
    try {
        const { city, nameHi, pincode, areas, location: geoLoc, serviceRadius, isActive, enabledServices } = req.body;
        if (!city) return res.status(400).json({ message: 'City name is required' });
        const location = await Location.create({ 
            city, 
            nameHi,
            pincode, 
            areas: normalizeAreas(areas),
            location: geoLoc,
            serviceRadius: serviceRadius || 10,
            isActive: isActive !== undefined ? isActive : true,
            enabledServices: enabledServices || []
        });
        res.status(201).json(location);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/admin/locations/:id - update location
router.put('/locations/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const body = { ...req.body };
        // Normalize areas if provided
        if (body.areas !== undefined) {
            body.areas = normalizeAreas(body.areas);
        }
        const location = await Location.findByIdAndUpdate(req.params.id, body, { new: true });
        if (!location) return res.status(404).json({ message: 'Location not found' });
        res.json(location);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/admin/locations/:id - remove location
router.delete('/locations/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const location = await Location.findByIdAndDelete(req.params.id);
        if (!location) return res.status(404).json({ message: 'Location not found' });
        res.json({ message: 'Location deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── User Saved Addresses Management (Admin) ──

// POST /api/admin/users/:userId/addresses - add an address to any user
router.post('/users/:userId/addresses', protect, authorize('admin'), async (req, res) => {
    try {
        const { label, address, location } = req.body;
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.savedAddresses.push({ label, address, location });
        await user.save();
        res.json({ message: 'Address added', addresses: user.savedAddresses });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/admin/users/:userId/addresses/:addrId - remove an address from any user
router.delete('/users/:userId/addresses/:addrId', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.savedAddresses = user.savedAddresses.filter(a => a._id.toString() !== req.params.addrId);
        await user.save();
        res.json({ message: 'Address removed', addresses: user.savedAddresses });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/admin/locations/:id/services — admin: update which services are enabled in a city
router.patch('/locations/:id/services', protect, authorize('admin'), async (req, res) => {
    try {
        const { enabledServices } = req.body;
        if (!Array.isArray(enabledServices)) {
            return res.status(400).json({ message: 'enabledServices must be an array' });
        }
        const location = await Location.findByIdAndUpdate(
            req.params.id,
            { enabledServices },
            { new: true }
        );
        if (!location) return res.status(404).json({ message: 'Location not found' });
        res.json(location);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/admin/locations/:id/toggle — admin: toggle a location active/inactive
router.patch('/locations/:id/toggle', protect, authorize('admin'), async (req, res) => {
    try {
        const location = await Location.findById(req.params.id);
        if (!location) return res.status(404).json({ message: 'Location not found' });
        location.isActive = !location.isActive;
        await location.save();
        res.json(location);
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
});

// ─── Area Management Routes ─────────────────────────────────────────────────

// POST /api/admin/locations/:id/areas — add a new area to a city
router.post('/locations/:id/areas', protect, authorize('admin'), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Area name is required' });
        }
        const location = await Location.findById(req.params.id);
        if (!location) return res.status(404).json({ message: 'Location not found' });

        // Prevent duplicate area names (case-insensitive)
        const exists = location.areas.some(a => {
            const aName = typeof a === 'string' ? a : a.name;
            return aName.toLowerCase() === name.trim().toLowerCase();
        });
        if (exists) return res.status(409).json({ message: 'Area already exists' });

        location.areas.push({ name: name.trim(), isActive: true });
        await location.save();
        res.json(location);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH /api/admin/locations/:id/areas/:areaName/toggle — toggle specific area ON/OFF
router.patch('/locations/:id/areas/:areaName/toggle', protect, authorize('admin'), async (req, res) => {
    try {
        const location = await Location.findById(req.params.id);
        if (!location) return res.status(404).json({ message: 'Location not found' });

        // Find the area (support both string and object)
        const idx = location.areas.findIndex(a => {
            const aName = typeof a === 'string' ? a : a.name;
            return aName.toLowerCase() === decodeURIComponent(req.params.areaName).toLowerCase();
        });
        if (idx === -1) return res.status(404).json({ message: 'Area not found' });

        // Normalize string areas to objects on first toggle
        if (typeof location.areas[idx] === 'string') {
            location.areas[idx] = { name: location.areas[idx], isActive: false };
        } else {
            location.areas[idx].isActive = !location.areas[idx].isActive;
        }

        location.markModified('areas');
        await location.save();
        res.json(location);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/admin/locations/:id/areas/:areaName — remove an area from a city
router.delete('/locations/:id/areas/:areaName', protect, authorize('admin'), async (req, res) => {
    try {
        const location = await Location.findById(req.params.id);
        if (!location) return res.status(404).json({ message: 'Location not found' });

        const targetName = decodeURIComponent(req.params.areaName).toLowerCase();
        const before = location.areas.length;
        location.areas = location.areas.filter(a => {
            const aName = typeof a === 'string' ? a : a.name;
            return aName.toLowerCase() !== targetName;
        });

        if (location.areas.length === before) {
            return res.status(404).json({ message: 'Area not found' });
        }

        location.markModified('areas');
        await location.save();
        res.json(location);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

