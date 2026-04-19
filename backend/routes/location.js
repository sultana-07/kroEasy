const express = require('express');
const router = express.Router();
const Location = require('../models/Location');

/**
 * GET /api/locations — public listing
 * Returns only active cities, and within each city only active areas.
 * This is the single source of truth for all dropdowns on the frontend.
 */
router.get('/', async (req, res) => {
    try {
        const locations = await Location.find({ isActive: true }).sort({ city: 1 }).lean();

        // Strip inactive areas so the frontend never sees them
        const filtered = locations.map(loc => ({
            ...loc,
            areas: (loc.areas || []).filter(a => {
                // Support both old string format and new {name, isActive} format
                if (typeof a === 'string') return true;
                return a.isActive !== false;
            }),
        }));

        res.json(filtered);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
