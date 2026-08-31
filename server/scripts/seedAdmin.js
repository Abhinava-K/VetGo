require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { encryptField } = require('../middleware/encryption');

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGO_URI is not set in environment or .env file.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB.');

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@vetgo.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminPhone = process.env.ADMIN_PHONE || '+18005550100';

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    let phoneEncrypted = '';
    try {
      phoneEncrypted = encryptField(adminPhone);
    } catch (e) {
      phoneEncrypted = adminPhone;
    }

    let existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      existingAdmin.role = 'ADMIN';
      existingAdmin.passwordHash = passwordHash;
      existingAdmin.phoneEncrypted = phoneEncrypted;
      await existingAdmin.save();
      console.log(`✅ Admin user updated: ${adminEmail}`);
    } else {
      await User.create({
        email: adminEmail,
        passwordHash,
        phoneEncrypted,
        name: {
          first: 'System',
          last: 'Admin'
        },
        role: 'ADMIN'
      });
      console.log(`✅ Admin user created: ${adminEmail}`);
    }

    console.log('--------------------------------------------------');
    console.log('🔑 ADMIN CREDENTIALS:');
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('--------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedAdmin();
