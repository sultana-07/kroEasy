const express = require('express');
const router = express.Router();
const Labour = require('../models/Labour');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Helper: parse pagination query params
const paginate = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

// GET /api/labours - public listing with filters + pagination
router.get('/', async (req, res) => {
    try {
        const { city, area, pincode, skills } = req.query;
        const filter = { isApproved: true, availability: true };  // only show online workers
        
        if (city) {
            filter.$or = [
                { city: { $regex: city, $options: 'i' } },
                { serviceCities: { $regex: city, $options: 'i' } },
            ];
        }
        
        if (area) {
            if (!filter.$or) filter.$or = [];
            filter.$or.push({ serviceAreas: { $regex: area, $options: 'i' } });
            filter.$or.push({ description: { $regex: area, $options: 'i' } });
        }
        
        if (pincode) {
            filter.pincode = pincode;
        }
        const STANDARD_SKILLS = [
            'Electrician', 'Plumber', 'Carpenter', 'Mason',
            'Beautician', 'AC Technician', 'Mehndi Artist', 'Helper',
        ];
        if (skills === '__other__') {
            // Workers whose skills contain NONE of the standard options
            filter.skills = { $not: { $elemMatch: { $in: STANDARD_SKILLS } } };
        } else if (skills) {
            filter.skills = { $in: skills.split(',').map(s => s.trim()) };
        }


        // ── Geo-filtering ──────────────────────────────────────────────────
        const { lat, lng, radius } = req.query;
        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            const maxDistance = (parseFloat(radius) || 10) * 1000; // default 10km in meters

            filter.location = {
                $near: {
                    $geometry: { type: 'Point', coordinates: [longitude, latitude] },
                    $maxDistance: maxDistance,
                },
            };
        }
        // ───────────────────────────────────────────────────────────────────

        const { page, limit, skip } = paginate(req.query);
        const [labours, total] = await Promise.all([
            Labour.find(filter)
                .populate('userId', 'name phone city')
                .sort(lat && lng ? {} : { rating: -1, bookingCount: -1, reviewCount: -1, createdAt: 1 })
                .skip(skip)
                .limit(limit),
            Labour.countDocuments(filter),
        ]);

        res.json({
            data: labours,
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/labours/my - get own labour profile
router.get('/my', protect, authorize('labour'), async (req, res) => {
    try {
        const labour = await Labour.findOne({ userId: req.user._id }).populate('userId', 'name phone city');
        if (!labour) return res.status(404).json({ message: 'Labour profile not found' });
        res.json(labour);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/labours/my/stats - get profile view stats for the logged-in labour
router.get('/my/stats', protect, authorize('labour'), async (req, res) => {
    try {
        const labour = await Labour.findOne({ userId: req.user._id }).select('profileViews');
        if (!labour) return res.status(404).json({ message: 'Profile not found' });

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayViews = labour.profileViews.filter(v => new Date(v.date) >= todayStart).length;
        const monthlyViews = labour.profileViews.filter(v => new Date(v.date) >= monthStart).length;

        res.json({ todayViews, monthlyViews });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/labour/:id - get public labour profile by id
router.get('/:id', async (req, res) => {
    try {
        const labour = await Labour.findById(req.params.id).populate('userId', 'name phone city');
        if (!labour) return res.status(404).json({ message: 'Labour not found' });
        // Record this profile view (fire-and-forget)
        Labour.findByIdAndUpdate(req.params.id, { $push: { profileViews: { date: new Date() } } }).catch(() => { });
        res.json(labour);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/labour/:id/reviews - all reviews for a labour
router.get('/:id/reviews', async (req, res) => {
    try {
        const Booking = require('../models/Booking');
        const { page, limit, skip } = paginate(req.query);
        const filter = {
            providerId: req.params.id,
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
        res.json({ data: reviews, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/labour/:id - update labour profile
router.patch('/:id', protect, authorize('labour'), async (req, res) => {
    try {
        const labour = await Labour.findById(req.params.id);
        if (!labour) return res.status(404).json({ message: 'Labour not found' });
        if (labour.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        // Enforce max 3 skills
        if (Array.isArray(req.body.skills) && req.body.skills.length > 3) {
            return res.status(400).json({ message: 'Workers can select a maximum of 3 skills/services.' });
        }
        const updated = await Labour.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('userId', 'name phone city');
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/labour/:id/upload-image - upload profile image to Cloudinary
router.post('/:id/upload-image', protect, authorize('labour'), upload.single('image'), async (req, res) => {
    try {
        const labour = await Labour.findById(req.params.id);
        if (!labour) return res.status(404).json({ message: 'Labour not found' });
        if (labour.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const updated = await Labour.findByIdAndUpdate(
            req.params.id,
            { profileImage: req.file.path },
            { new: true }
        ).populate('userId', 'name phone city');
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/labour/profile/location - update live location
router.patch('/profile/location', protect, authorize('labour'), async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ message: 'Latitude and Longitude are required' });
        }

        const labour = await Labour.findOneAndUpdate(
            { userId: req.user._id },
            {
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                }
            },
            { new: true }
        );

        if (!labour) return res.status(404).json({ message: 'Labour profile not found' });
        res.json({ ok: true, location: labour.location });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/labour/profile/online-status - toggle online/offline status
router.patch('/profile/online-status', protect, authorize('labour'), async (req, res) => {
    try {
        const { isOnline } = req.body;
        const labour = await Labour.findOneAndUpdate(
            { userId: req.user._id },
            { isOnline: !!isOnline, availability: !!isOnline },
            { new: true }
        );
        if (!labour) return res.status(404).json({ message: 'Labour profile not found' });
        res.json({ ok: true, isOnline: labour.isOnline, availability: labour.availability });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/labour/:id/view - record a profile view (called when drawer opens)
router.post('/:id/view', async (req, res) => {
    try {
        await Labour.findByIdAndUpdate(req.params.id, { $push: { profileViews: { date: new Date() } } });
        res.json({ ok: true });
    } catch {
        res.status(500).json({ ok: false });
    }
});

module.exports = router;
