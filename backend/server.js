require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

// ── Keep-alive: ping ourselves every 14 minutes to prevent Render cold starts ──
const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL;
if (SELF_URL) {
    setInterval(() => {
        fetch(`${SELF_URL}/api/health`).catch(() => { });
    }, 14 * 60 * 1000); // every 14 min (Render sleeps after 15 min)
    console.log(`🔄 Keep-alive enabled: pinging ${SELF_URL} every 14 min`);
}

// Rate limiting — 200 requests per minute per IP
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please slow down and try again in a minute.' },
});
app.use('/api/', limiter);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Response compression ──
try {
    const compression = require('compression');
    app.use(compression());
    console.log('📦 Response compression enabled');
} catch { /* compression not installed, skip */ }

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/labours', require('./routes/labour'));
app.use('/api/labour', require('./routes/labour'));
app.use('/api/cars', require('./routes/car'));
app.use('/api/car', require('./routes/car'));
app.use('/api/booking', require('./routes/booking'));
app.use('/api/call-log', require('./routes/callLog'));
app.use('/api/admin', require('./routes/admin'));

// Health check (also used by keep-alive)
app.get('/api/health', (req, res) =>
    res.json({ status: 'OK', message: 'KroEasy API running', uptime: process.uptime() | 0 })
);

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
    console.log(`🚀 KroEasy API running on port ${PORT}`)
);
