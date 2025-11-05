// Script to fix existing nurses with passwordChangedAt issue
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Nurse from './models/Nurse.js';

dotenv.config();

const fixPasswordChangedAt = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nurse-scheduling');
    console.log('✅ Connected to MongoDB');

    // Update all nurses to remove passwordChangedAt if they haven't actually changed their password
    // This fixes the issue where the default value causes JWT validation to fail
    const result = await Nurse.updateMany(
      { passwordChangedAt: { $exists: true } },
      { $unset: { passwordChangedAt: '' } }
    );

    console.log(`✅ Fixed ${result.modifiedCount} nurses`);
    console.log('   Removed passwordChangedAt field to fix JWT authentication');
    console.log('   This field will only be set when passwords are actually changed');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixPasswordChangedAt();
