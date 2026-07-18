require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { encryptField } = require('../middleware/encryption');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    const email = process.env.ADMIN_EMAIL || 'admin@vetgo.app';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';
    const phone = process.env.ADMIN_PHONE || '0000000000';

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log('Admin already exists. Skipping...');
      process.exit(0);
    }

    const phoneEncrypted = encryptField(phone);

    await User.create({
      name: { first: 'System', last: 'Admin' },
      email,
      passwordHash: password,
      phoneEncrypted,
      role: 'ADMIN'
    });

    console.log('Admin user created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
