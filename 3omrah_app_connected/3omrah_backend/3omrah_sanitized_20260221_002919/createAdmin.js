/**
 * Admin Creation Script
 * Run: node createAdmin.js
 * Creates admin user: username=admin, phoneNumber=admin, password=Admin@12345
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rehlatty');
    console.log('✅ Connected to MongoDB');

    const adminPhone = '01000000000';
    const existing = await User.findOne({ phoneNumber: adminPhone });

    if (existing) {
      console.log('⚠️  Admin user already exists. Updating password and role...');
      existing.role = 'admin';
      existing.username = 'admin';
      existing.permissions = ['full_admin_access'];
      await existing.setPassword('Admin@12345');
      await existing.save();
      console.log('✅ Admin user updated successfully!');
    } else {
      const admin = new User({
        username: 'admin',
        phoneNumber: adminPhone,
        role: 'admin',
        permissions: ['full_admin_access'],
      });
      await User.register(admin, 'Admin@12345');
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n🔐 Admin Credentials:');
    console.log('   Phone Number (Username field): 01000000000');
    console.log('   Password: Admin@12345');
    console.log('\n🌐 Login at: /login');
    console.log('📊 Dashboard at: /admin/dashboard');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
