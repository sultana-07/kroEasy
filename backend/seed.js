const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load env manually
require('dotenv').config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/apniseva');
        console.log('✅ MongoDB Connected');

        // Define inline schema to avoid import issues
        const userSchema = new mongoose.Schema({
            name: String,
            phone: { type: String, unique: true },
            password: String,
            role: String,
            city: String,
            isActive: { type: Boolean, default: true },
            isSuspended: { type: Boolean, default: false },
        }, { timestamps: true });

        const User = mongoose.models.User || mongoose.model('User', userSchema);

        const existing = await User.findOne({ phone: '9999999999' });
        if (existing) {
            console.log('✅ Admin already exists!');
            console.log('   Phone: 9999999999 | Password: admin123');
            await mongoose.disconnect();
            return;
        }

        const hashedPassword = await bcrypt.hash('admin123', 12);
        await User.create({
            name: 'Admin',
            phone: '9999999999',
            password: hashedPassword,
            role: 'admin',
            city: 'Delhi',
        });

        console.log('✅ Admin created!');
        console.log('   Phone: 9999999999');
        console.log('   Password: admin123');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Seed error:', err.message);
        process.exit(1);
    }
}

seed();
