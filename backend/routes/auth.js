const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Labour = require('../models/Labour');
const CarOwner = require('../models/CarOwner');

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

        res.json({
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

// POST /api/auth/upload-avatar — needs full user doc
const { upload } = require('../config/cloudinary');
const { protect, loadUser } = require('../middleware/auth');

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

module.exports = router;
