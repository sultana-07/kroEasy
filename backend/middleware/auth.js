const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // ─── Fast path: embed payload fields (no DB call needed) ───────────
            // Tokens issued after the update include role, city, isSuspended.
            if (decoded.role) {
                if (decoded.isSuspended) {
                    return res.status(403).json({ message: 'Account suspended' });
                }
                // Build a lightweight user object from the token payload
                req.user = {
                    _id: decoded.id,
                    role: decoded.role,
                    city: decoded.city || '',
                    isSuspended: decoded.isSuspended || false,
                    _fromToken: true,  // flag so routes can force a DB fetch if needed
                };
                return next();
            }

            // ─── Fallback: old token without embedded fields — hit DB once ─────
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) return res.status(401).json({ message: 'User not found' });
            if (req.user.isSuspended) return res.status(403).json({ message: 'Account suspended' });
            return next();

        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

/**
 * Use this when a route NEEDS the full user document from DB.
 * Example: avatar upload, profile update.
 */
const loadUser = async (req, res, next) => {
    if (req.user && req.user._fromToken) {
        try {
            req.user = await User.findById(req.user._id).select('-password');
            if (!req.user) return res.status(401).json({ message: 'User not found' });
        } catch (error) {
            return res.status(500).json({ message: 'Failed to load user' });
        }
    }
    next();
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Role '${req.user.role}' is not authorized` });
        }
        next();
    };
};

module.exports = { protect, authorize, loadUser };
