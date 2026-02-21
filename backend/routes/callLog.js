const express = require('express');
const router = express.Router();
const CallLog = require('../models/CallLog');
const Labour = require('../models/Labour');
const Car = require('../models/Car');

// POST /api/call-log
router.post('/', async (req, res) => {
    try {
        const { userId, targetId, targetType, phone } = req.body;
        const log = await CallLog.create({ userId, targetId, targetType, phone });

        // Increment lead count
        if (targetType === 'labour') {
            await Labour.findByIdAndUpdate(targetId, { $inc: { leadCount: 1 } });
        } else if (targetType === 'car') {
            await Car.findByIdAndUpdate(targetId, { $inc: { leadCount: 1 } });
        }

        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
