const express = require('express');
const router  = express.Router();
const Video   = require('../models/Video');
const Labour  = require('../models/Labour');
const CarOwner = require('../models/CarOwner');
const { protect, authorize } = require('../middleware/auth');

/* ─────────────────────────────────────────────
   Helper: extract YouTube videoId from any
   YouTube Shorts URL format:
     https://youtube.com/shorts/VIDEO_ID
     https://www.youtube.com/shorts/VIDEO_ID
   Returns null if the URL is not a Shorts link.
───────────────────────────────────────────── */
function extractShortsId(url) {
    try {
        const u = new URL(url);
        const isYouTube = ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(u.hostname);
        if (!isYouTube) return null;

        // Must be a Shorts path: /shorts/<id>
        const match = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})$/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

/* ─────────────────────────────────────────────
   GET /api/videos
   Public feed — all active videos newest first.
   Populated with uploader name, phone, avatar,
   skills (labour) or city (carowner).
───────────────────────────────────────────── */
router.get('/', async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip  = (page - 1) * limit;

        const filter = { isActive: true };

        // Optional: filter by a specific uploader (for worker profile page)
        if (req.query.uploaderId) {
            filter.uploaderId = req.query.uploaderId;
        }

        const [videos, total] = await Promise.all([
            Video.find(filter)
                .populate('userId', 'name phone avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Video.countDocuments(filter),
        ]);

        // For each video attach uploader profile details (skills / city)
        const enriched = await Promise.all(
            videos.map(async (v) => {
                let profile = null;
                if (v.uploaderType === 'labour') {
                    profile = await Labour.findById(v.uploaderId)
                        .select('skills charges rating reviewCount profileImage availability city');
                } else {
                    profile = await CarOwner.findById(v.uploaderId)
                        .select('city isApproved');
                }
                return { ...v.toObject(), profile };
            })
        );

        res.json({ data: enriched, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ─────────────────────────────────────────────
   POST /api/videos
   Workers / car owners upload a YouTube Shorts link.
   Body: { youtubeUrl, title? }
───────────────────────────────────────────── */
router.post('/', protect, authorize('labour', 'carowner'), async (req, res) => {
    try {
        const { youtubeUrl, title } = req.body;

        if (!youtubeUrl) {
            return res.status(400).json({ message: 'YouTube Shorts link is required.' });
        }

        const videoId = extractShortsId(youtubeUrl.trim());
        if (!videoId) {
            return res.status(400).json({
                message: 'Only YouTube Shorts links are valid. Please paste a link like: https://youtube.com/shorts/VIDEO_ID',
            });
        }

        // Resolve uploader profile id
        let uploaderId, uploaderType;
        if (req.user.role === 'labour') {
            const labour = await Labour.findOne({ userId: req.user._id });
            if (!labour) return res.status(404).json({ message: 'Labour profile not found.' });
            uploaderId   = labour._id;
            uploaderType = 'labour';
        } else {
            const carOwner = await CarOwner.findOne({ userId: req.user._id });
            if (!carOwner) return res.status(404).json({ message: 'Car owner profile not found.' });
            uploaderId   = carOwner._id;
            uploaderType = 'carowner';
        }

        // Prevent duplicate uploads of the same video
        const exists = await Video.findOne({ videoId, isActive: true });
        if (exists) {
            return res.status(409).json({ message: 'This video has already been uploaded.' });
        }

        const video = await Video.create({
            uploaderId,
            uploaderType,
            userId:     req.user._id,
            youtubeUrl: youtubeUrl.trim(),
            videoId,
            title:      title?.trim() || '',
        });

        res.status(201).json(video);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ─────────────────────────────────────────────
   DELETE /api/videos/:id
   Admin only — hard delete a video record.
───────────────────────────────────────────── */
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const video = await Video.findByIdAndDelete(req.params.id);
        if (!video) return res.status(404).json({ message: 'Video not found.' });
        res.json({ message: 'Video deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ─────────────────────────────────────────────
   DELETE /api/videos/my/:id
   Worker/car owner can delete their own video.
───────────────────────────────────────────── */
router.delete('/my/:id', protect, authorize('labour', 'carowner'), async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ message: 'Video not found.' });
        if (video.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this video.' });
        }
        await video.deleteOne();
        res.json({ message: 'Video deleted.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/* ─────────────────────────────────────────────
   GET /api/videos/admin/all
   Admin — see ALL videos (active + deleted ones if needed).
   Returns videos populated with user + profile details.
───────────────────────────────────────────── */
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip  = (page - 1) * limit;

        const [videos, total] = await Promise.all([
            Video.find({})
                .populate('userId', 'name phone avatar role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Video.countDocuments({}),
        ]);

        // Attach profile (skills / city)
        const enriched = await Promise.all(
            videos.map(async (v) => {
                let profile = null;
                if (v.uploaderType === 'labour') {
                    profile = await Labour.findById(v.uploaderId).select('skills city charges rating');
                } else {
                    profile = await CarOwner.findById(v.uploaderId).select('city');
                }
                return { ...v.toObject(), profile };
            })
        );

        res.json({ data: enriched, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
