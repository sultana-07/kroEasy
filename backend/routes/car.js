const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const CarOwner = require('../models/CarOwner');
const { protect, authorize } = require('../middleware/auth');

// Helper: parse pagination query params
const paginate = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

// GET /api/cars - public listing with filters + pagination
router.get('/', async (req, res) => {
    try {
        const { ac, driverIncluded, priceType, city } = req.query;
        const filter = { availability: true };
        if (ac !== undefined) filter.ac = ac === 'true';
        if (driverIncluded !== undefined) filter.driverIncluded = driverIncluded === 'true';
        if (priceType) filter.priceType = priceType;
        if (city) filter.city = { $regex: city, $options: 'i' };

        // Only show cars belonging to APPROVED car owners
        const approvedOwners = await CarOwner.find({ isApproved: true }).select('_id').lean();
        const approvedOwnerIds = approvedOwners.map(o => o._id);
        filter.ownerId = { $in: approvedOwnerIds };

        const { page, limit, skip } = paginate(req.query);
        const [cars, total] = await Promise.all([
            Car.find(filter)
                .populate({ path: 'ownerId', populate: { path: 'userId', select: 'name phone city avatar' } })
                .sort({ rating: -1, bookingCount: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Car.countDocuments(filter),
        ]);

        res.json({
            data: cars,
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/cars/my - owner's own cars
router.get('/my', protect, authorize('carowner'), async (req, res) => {
    try {
        const owner = await CarOwner.findOne({ userId: req.user._id });
        if (!owner) return res.status(404).json({ message: 'Car owner profile not found' });
        const cars = await Car.find({ ownerId: owner._id });
        res.json(cars);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/cars/owner-profile - returns the CarOwner document for the logged-in user
// Used by the dashboard to poll isApproved without relying on potentially stale localStorage
router.get('/owner-profile', protect, authorize('carowner'), async (req, res) => {
    try {
        const owner = await CarOwner.findOne({ userId: req.user._id });
        if (!owner) return res.status(404).json({ message: 'Car owner profile not found' });
        res.json(owner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/cars/owner-profile - update CarOwner city
router.patch('/owner-profile', protect, authorize('carowner'), async (req, res) => {
    try {
        const { city } = req.body;
        const owner = await CarOwner.findOneAndUpdate(
            { userId: req.user._id },
            { city: city?.trim() || '' },
            { new: true }
        );
        if (!owner) return res.status(404).json({ message: 'Car owner profile not found' });
        res.json(owner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/cars/owner-stats - profile view stats for the logged-in car owner
router.get('/owner-stats', protect, authorize('carowner'), async (req, res) => {
    try {
        const owner = await CarOwner.findOne({ userId: req.user._id }).select('profileViews');
        if (!owner) return res.status(404).json({ message: 'Car owner profile not found' });

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayViews = owner.profileViews.filter(v => new Date(v.date) >= todayStart).length;
        const monthlyViews = owner.profileViews.filter(v => new Date(v.date) >= monthStart).length;

        res.json({ todayViews, monthlyViews });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/car - add car
router.post('/', protect, authorize('carowner'), async (req, res) => {
    try {
        const owner = await CarOwner.findOne({ userId: req.user._id });
        if (!owner) return res.status(404).json({ message: 'Car owner profile not found' });
        if (!owner.isApproved) return res.status(403).json({ message: 'Your account is pending approval' });

        console.log(req.body);
        const car = await Car.create({ ...req.body, ownerId: owner._id, city: req.user.city });
        res.status(201).json(car);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/car/:id - update car
router.patch('/:id', protect, authorize('carowner'), async (req, res) => {
    try {
        console.log(req.body);
        const owner = await CarOwner.findOne({ userId: req.user._id });
        const car = await Car.findOne({ _id: req.params.id, ownerId: owner._id });
        if (!car) return res.status(404).json({ message: 'Car not found or not authorized' });
        const updated = await Car.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/car/:id/reviews - public reviews for a car
router.get('/:id/reviews', async (req, res) => {
    try {
        const Booking = require('../models/Booking');
        const { page, limit, skip } = paginate(req.query);
        const filter = {
            carId: req.params.id,
            'review.rating': { $exists: true, $ne: null },
        };
        const [reviews, total] = await Promise.all([
            Booking.find(filter)
                .populate('userId', 'name avatar')
                .sort({ 'review.createdAt': -1 })
                .select('review userId createdAt')
                .skip(skip)
                .limit(limit),
            Booking.countDocuments(filter),
        ]);
        // Record a view on the car owner's profile (fire-and-forget)
        Car.findById(req.params.id).select('ownerId').then(car => {
            if (car?.ownerId) {
                CarOwner.findByIdAndUpdate(car.ownerId, { $push: { profileViews: { date: new Date() } } }).catch(() => { });
            }
        }).catch(() => { });
        res.json({ data: reviews, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/car/:id
router.delete('/:id', protect, authorize('carowner'), async (req, res) => {
    try {
        const owner = await CarOwner.findOne({ userId: req.user._id });
        const car = await Car.findOne({ _id: req.params.id, ownerId: owner._id });
        if (!car) return res.status(404).json({ message: 'Car not found or not authorized' });
        await Car.findByIdAndDelete(req.params.id);
        res.json({ message: 'Car deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/car/:id/view - record a view when the car drawer opens
router.post('/:id/view', async (req, res) => {
    try {
        const car = await Car.findById(req.params.id).select('ownerId').lean();
        if (car?.ownerId) {
            await CarOwner.findByIdAndUpdate(car.ownerId, { $push: { profileViews: { date: new Date() } } });
        }
        res.json({ ok: true });
    } catch {
        res.status(500).json({ ok: false });
    }
});

module.exports = router;
