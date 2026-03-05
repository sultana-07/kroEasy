const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Labour = require('../models/Labour');
const CarOwner = require('../models/CarOwner');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const CallLog = require('../models/CallLog');
const PwaInstall = require('../models/PwaInstall');
const { protect, authorize } = require('../middleware/auth');

// Helper: parse pagination query params
const paginate = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(query.limit) || 50));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

router.get('/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const [users, labours, carOwners, cars, bookings, callLogs, pwaInstalls] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            Labour.countDocuments(),
            CarOwner.countDocuments(),
            Car.countDocuments(),
            Booking.countDocuments(),
            CallLog.countDocuments(),
            PwaInstall.countDocuments(),
        ]);
        res.json({ users, labours, carOwners, cars, bookings, callLogs, pwaInstalls });
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
            Car.find().select('ownerId').lean(),
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

        const labourStats = labours.map(l => ({
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
        }));

        // Build call count maps keyed by car._id for car-type logs
        const todayCarCallMapByCar = toMap(todayCalls.filter(x => x.targetType === 'car'));
        const weekCarCallMapByCar = toMap(weekCalls.filter(x => x.targetType === 'car'));
        const monthCarCallMapByCar = toMap(monthCalls.filter(x => x.targetType === 'car'));

        const carOwnerStats = carOwners.map(o => ({
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
        }));

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

module.exports = router;
