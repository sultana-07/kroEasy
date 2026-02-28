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
        const { city, skills, availability } = req.query;
        const filter = { isApproved: true };
        if (city) filter.city = { $regex: city, $options: 'i' };
        const STANDARD_SKILLS = [
            'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Mason', 'Welder',
            'Driver', 'Cleaner', 'Cook', 'Beautician', 'Gardener', 'Guard',
            'AC Technician', 'Mehndi Artist', 'Helper',
        ];
        if (skills === '__other__') {
            // Workers whose skills contain NONE of the standard options
            filter.skills = { $not: { $elemMatch: { $in: STANDARD_SKILLS } } };
        } else if (skills) {
            filter.skills = { $in: skills.split(',').map(s => s.trim()) };
        }

        if (availability !== undefined) filter.availability = availability === 'true';

        const { page, limit, skip } = paginate(req.query);
        const [labours, total] = await Promise.all([
            Labour.find(filter)
                .populate('userId', 'name phone city')
                .sort({ rating: -1, bookingCount: -1, createdAt: -1 })
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

// GET /api/labour/:id - get public labour profile by id
router.get('/:id', async (req, res) => {
    try {
        const labour = await Labour.findById(req.params.id).populate('userId', 'name phone city');
        if (!labour) return res.status(404).json({ message: 'Labour not found' });
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

module.exports = router;
