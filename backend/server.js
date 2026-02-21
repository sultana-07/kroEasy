require('dotenv').config();
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    console.log(`🧠 Master process ${process.pid} started — forking ${numCPUs} workers`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`⚠️  Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
        cluster.fork();
    });
} else {
    const express = require('express');
    const cors = require('cors');
    const rateLimit = require('express-rate-limit');
    const mongoose = require('mongoose');
    const connectDB = require('./config/db');

    const app = express();

    // Connect to MongoDB with optimised pool
    connectDB();

    // Rate limiting — 200 requests per minute per IP
    const limiter = rateLimit({
        windowMs: 60 * 1000,       // 1 minute
        max: 200,                  // raised: 8 workers + normal app usage needs headroom
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: 'Too many requests, please slow down and try again in a minute.' },
    });
    app.use('/api/', limiter);

    // Middleware
    app.use(cors({ origin: '*' }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/labours', require('./routes/labour'));
    app.use('/api/labour', require('./routes/labour'));
    app.use('/api/cars', require('./routes/car'));
    app.use('/api/car', require('./routes/car'));
    app.use('/api/booking', require('./routes/booking'));
    app.use('/api/call-log', require('./routes/callLog'));
    app.use('/api/admin', require('./routes/admin'));

    // Health check
    app.get('/api/health', (req, res) =>
        res.json({ status: 'OK', message: 'ApniSeva API running', worker: process.pid })
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
        console.log(`🚀 Worker ${process.pid} — ApniSeva API running on port ${PORT}`)
    );
}
