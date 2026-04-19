const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Labour = require('../models/Labour');
const CarOwner = require('../models/CarOwner');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const { protect, authorize } = require('../middleware/auth');

// Helper: parse pagination query params
const paginate = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

// All routes below require citypartner role.
// City is always read from the JWT token — never from the request body.

// GET /api/citypartner/stats — counts for partner's city only
router.get('/stats', protect, authorize('citypartner'), async (req, res) => {
    try {
        const city = req.user.city;
        if (!city) return res.status(400).json({ message: 'No city assigned to this partner account' });

        const cityRegex = { $regex: city, $options: 'i' };

        const [labours, pendingLabours, carOwners, pendingCarOwners, cars] = await Promise.all([
            Labour.countDocuments({ city: cityRegex }),
            Labour.countDocuments({ city: cityRegex, isApproved: false }),
            CarOwner.countDocuments({ city: cityRegex }),
            CarOwner.countDocuments({ city: cityRegex, isApproved: false }),
            Car.countDocuments({ city: cityRegex }),
        ]);

        res.json({ labours, pendingLabours, carOwners, pendingCarOwners, cars, city });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/citypartner/labours — all labours in partner's city
router.get('/labours', protect, authorize('citypartner'), async (req, res) => {
    try {
        const city = req.user.city;
        if (!city) return res.status(400).json({ message: 'No city assigned to this partner account' });

        const { page, limit, skip } = paginate(req.query);
        const filter = { city: { $regex: city, $options: 'i' } };

        const [labours, total] = await Promise.all([
            Labour.find(filter)
                .populate('userId', 'name phone city isSuspended')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Labour.countDocuments(filter),
        ]);

        res.json({ data: labours, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/citypartner/carowners — all car owners in partner's city
router.get('/carowners', protect, authorize('citypartner'), async (req, res) => {
    try {
        const city = req.user.city;
        if (!city) return res.status(400).json({ message: 'No city assigned to this partner account' });

        const { page, limit, skip } = paginate(req.query);
        const filter = { city: { $regex: city, $options: 'i' } };

        const [owners, total] = await Promise.all([
            CarOwner.find(filter)
                .populate('userId', 'name phone city isSuspended')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            CarOwner.countDocuments(filter),
        ]);

        res.json({ data: owners, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/citypartner/bookings — recent bookings in partner's city, enriched with provider info
router.get('/bookings', protect, authorize('citypartner'), async (req, res) => {
    try {
        const city = req.user.city;
        if (!city) return res.status(400).json({ message: 'No city assigned to this partner account' });

        const cityRegex = { $regex: city, $options: 'i' };

        // Get all labour/carowner IDs in this city
        const [cityLabours, cityCarOwners] = await Promise.all([
            Labour.find({ city: cityRegex }).select('_id').lean(),
            CarOwner.find({ city: cityRegex }).select('_id').lean(),
        ]);
        const labourIds = cityLabours.map(l => l._id);
        const carOwnerIds = cityCarOwners.map(o => o._id);

        const { page, limit, skip } = paginate(req.query);

        const filter = {
            $or: [
                { providerType: 'labour', providerId: { $in: labourIds } },
                { providerType: 'car', providerId: { $in: carOwnerIds } },
            ],
        };

        const [bookings, total] = await Promise.all([
            Booking.find(filter)
                .populate('userId', 'name phone city')
                .populate('carId', 'carName modelYear basePrice priceType')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Booking.countDocuments(filter),
        ]);

        // Enrich with provider details
        const labourBookingIds = bookings.filter(b => b.providerType === 'labour').map(b => b.providerId);
        const carOwnerBookingIds = bookings.filter(b => b.providerType === 'car').map(b => b.providerId);

        const [labourProviders, carOwnerProviders] = await Promise.all([
            Labour.find({ _id: { $in: labourBookingIds } })
                .populate('userId', 'name phone city')
                .select('skills charges city userId')
                .lean(),
            CarOwner.find({ _id: { $in: carOwnerBookingIds } })
                .populate('userId', 'name phone city')
                .lean(),
        ]);

        const labourMap = Object.fromEntries(labourProviders.map(l => [l._id.toString(), l]));
        const carOwnerMap = Object.fromEntries(carOwnerProviders.map(o => [o._id.toString(), o]));

        const enrichedBookings = bookings.map(b => {
            let providerDetails = null;
            if (b.providerType === 'labour') providerDetails = labourMap[b.providerId?.toString()];
            else if (b.providerType === 'car') providerDetails = carOwnerMap[b.providerId?.toString()];
            return { ...b, providerDetails };
        });

        res.json({ data: enrichedBookings, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/citypartner/approve-labour/:id
router.patch('/approve-labour/:id', protect, authorize('citypartner'), async (req, res) => {
    try {
        const city = req.user.city;
        const labour = await Labour.findById(req.params.id).lean();
        if (!labour) return res.status(404).json({ message: 'Worker not found' });

        // Enforce city boundary
        if (!labour.city || !labour.city.toLowerCase().includes(city.toLowerCase())) {
            return res.status(403).json({ message: 'Not authorized — worker belongs to a different city' });
        }

        const { isApproved } = req.body;
        const updated = await Labour.findByIdAndUpdate(req.params.id, { isApproved }, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/citypartner/approve-carowner/:id
router.patch('/approve-carowner/:id', protect, authorize('citypartner'), async (req, res) => {
    try {
        const city = req.user.city;
        const owner = await CarOwner.findById(req.params.id).lean();
        if (!owner) return res.status(404).json({ message: 'Car owner not found' });

        // Enforce city boundary
        if (!owner.city || !owner.city.toLowerCase().includes(city.toLowerCase())) {
            return res.status(403).json({ message: 'Not authorized — car owner belongs to a different city' });
        }

        const { isApproved } = req.body;
        const updated = await CarOwner.findByIdAndUpdate(req.params.id, { isApproved }, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/citypartner/suspend-user/:id
// Can suspend a user whose linked Labour or CarOwner profile is in the partner's city
router.patch('/suspend-user/:id', protect, authorize('citypartner'), async (req, res) => {
    try {
        const city = req.user.city;
        const targetUser = await User.findById(req.params.id).select('role city').lean();
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        // Verify this user belongs to the partner's city via their Labour/CarOwner profile
        let cityMatch = false;
        if (targetUser.role === 'labour') {
            const labour = await Labour.findOne({ userId: req.params.id }).select('city').lean();
            if (labour?.city?.toLowerCase().includes(city.toLowerCase())) cityMatch = true;
        } else if (targetUser.role === 'carowner') {
            const owner = await CarOwner.findOne({ userId: req.params.id }).select('city').lean();
            if (owner?.city?.toLowerCase().includes(city.toLowerCase())) cityMatch = true;
        }

        if (!cityMatch) {
            return res.status(403).json({ message: 'Not authorized — user belongs to a different city' });
        }

        const { isSuspended } = req.body;
        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { isSuspended },
            { new: true }
        ).select('-password');

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
