const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

dotenv.config();

/**
 * CLI script to create an admin directly into MongoDB
 * Usage: node scripts/createAdmin.js <username> <password>
 * Or reads from .env: ADMIN_USERNAME and ADMIN_PASSWORD
 */
const createAdminCLI = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus_coin_db';
    await mongoose.connect(mongoURI);

    const args = process.argv.slice(2);
    const username = args[0] || process.env.ADMIN_USERNAME;
    const password = args[1] || process.env.ADMIN_PASSWORD;

    if (!username || !password) {
      console.error('\n[Error] Username and Password are required!');
      console.log('Usage: node scripts/createAdmin.js <username> <password>');
      console.log('Or set ADMIN_USERNAME and ADMIN_PASSWORD in your .env file.\n');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('\n[Error] Password must be at least 6 characters long.\n');
      process.exit(1);
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if admin already exists
    let admin = await Admin.findOne({ username: cleanUsername });

    if (admin) {
      // Update existing admin password
      admin.password = password; // pre('save') hook will hash with bcryptjs
      await admin.save();
      console.log(`\n[Success] Password updated for existing Admin: "${cleanUsername}" in MongoDB.\n`);
    } else {
      // Create new admin
      admin = await Admin.create({
        username: cleanUsername,
        password: password // pre('save') hook will hash with bcryptjs
      });
      console.log(`\n[Success] New Admin account "${cleanUsername}" created in MongoDB database.\n`);
    }

    console.log(`Database Document ID: ${admin._id}`);
    console.log(`Note: Password has been hashed using bcrypt and stored safely in the 'admins' collection.\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n[Error] Failed to create admin:', error.message);
    process.exit(1);
  }
};

createAdminCLI();
