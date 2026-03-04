const express = require('express');
const router = express.Router();
const PwaInstall = require('../models/PwaInstall');

// POST /api/pwa/install — record a PWA install (public, no auth needed)
router.post('/install', async (req, res) => {
    try {
        const { platform = 'unknown' } = req.body;
        await PwaInstall.create({ platform });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
