// List all nurses in the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Nurse from './models/Nurse.js';

dotenv.config();

const listNurses = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nurse-scheduling');
    console.log('✅ Connected to MongoDB\n');

    const nurses = await Nurse.find({}).select('nurseId name role _id');
    
    console.log(`Found ${nurses.length} nurses:\n`);
    nurses.forEach(nurse => {
      console.log(`   ${nurse.nurseId.padEnd(15)} | ${nurse.name.padEnd(25)} | ${nurse.role.padEnd(15)} | _id: ${nurse._id}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

listNurses();
