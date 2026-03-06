const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Labour = require('../models/Labour');
const CarOwner = require('../models/CarOwner');
const { upload } = require('../config/cloudinary');
const { protect, loadUser } = require('../middleware/auth');


// Embed role, city, and isSuspended into token so auth middleware can skip DB lookup
const generateToken = (user) =>
    jwt.sign(
        {
            id: user._id,
            role: user.role,
            city: user.city || '',
            isSuspended: user.isSuspended || false,
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, phone, password, role, city, skills, experience, charges, description } = req.body;

        const existingUser = await User.findOne({ phone });
        if (existingUser) return res.status(400).json({ message: 'Phone number already registered' });

        const user = await User.create({ name, phone, password, role: role || 'user', city });

        if (role === 'labour') {
            await Labour.create({
                userId: user._id,
                skills: skills || [],
                experience: experience || 0,
                charges: charges || '',
                description: description || '',
                city,
            });
        } else if (role === 'carowner') {
            await CarOwner.create({ userId: user._id, city });
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            city: user.city,
            token: generateToken(user),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone });
        if (!user) return res.status(401).json({ message: 'Invalid phone or password' });
        if (user.isSuspended) return res.status(403).json({ message: 'Account suspended. Contact admin.' });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid phone or password' });

        // Fetch approval status from the relevant profile model
        let approvalStatus = null;
        if (user.role === 'carowner') {
            const profile = await CarOwner.findOne({ userId: user._id }).select('isApproved');
            if (profile) approvalStatus = profile.isApproved ? 'approved' : 'pending';
        } else if (user.role === 'labour') {
            const profile = await Labour.findOne({ userId: user._id }).select('isApproved');
            if (profile) approvalStatus = profile.isApproved ? 'approved' : 'pending';
        }

        res.json({
            _id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            city: user.city,
            avatar: user.avatar,
            approvalStatus,
            token: generateToken(user),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/auth/me — poll for fresh user data including approvalStatus (called by dashboards)
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password -resetPasswordToken -resetPasswordExpiry');
        if (!user) return res.status(404).json({ message: 'User not found' });

        let approvalStatus = null;
        if (user.role === 'carowner') {
            const profile = await CarOwner.findOne({ userId: user._id }).select('isApproved');
            if (profile) approvalStatus = profile.isApproved ? 'approved' : 'pending';
        } else if (user.role === 'labour') {
            const profile = await Labour.findOne({ userId: user._id }).select('isApproved');
            if (profile) approvalStatus = profile.isApproved ? 'approved' : 'pending';
        }

        res.json({
            _id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            city: user.city,
            avatar: user.avatar,
            approvalStatus,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/upload-avatar', protect, loadUser, upload.single('image'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: req.file.path },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/request-reset — User requests a password reset (stores token, admin sends the link)
router.post('/request-reset', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: 'Phone number is required' });

        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ message: 'No account found with this phone number' });

        // Generate a random token (expires in 10 minutes)
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.resetPasswordToken = token;
        user.resetPasswordExpiry = expiry;
        await user.save();

        res.json({ message: 'Reset request submitted. Please contact admin to receive your reset link.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/reset-password/:token — Validate token and update password
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: new Date() }, // must not be expired
        });

        if (!user) {
            return res.status(400).json({ message: 'Reset link is invalid or has expired. Please request a new one.' });
        }

        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpiry = null;
        await user.save();

        res.json({ message: 'Password updated successfully. You can now login.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/auth/profile — Update name and city
router.put('/profile', protect, async (req, res) => {
    try {
        const { name, city } = req.body;
        const updates = {};
        if (name) updates.name = name.trim();
        if (city !== undefined) updates.city = city.trim();

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true }
        ).select('-password -resetPasswordToken -resetPasswordExpiry');

        res.json({
            _id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            city: user.city,
            avatar: user.avatar,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/auth/change-password — Verify old password then set new password
router.put('/change-password', protect, loadUser, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Both old and new passwords are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = req.user;
        const isMatch = await user.matchPassword(oldPassword);
        if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
