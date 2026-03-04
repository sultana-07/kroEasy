const mongoose = require('mongoose');

const pwaInstallSchema = new mongoose.Schema({
    platform: {
        type: String,
        enum: ['android', 'ios', 'desktop', 'unknown'],
        default: 'unknown',
    },
    installedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('PwaInstall', pwaInstallSchema);
