import mongoose from 'mongoose';
import Nurse from './models/Nurse.js';
import dotenv from 'dotenv';

dotenv.config();

const createTestNurse = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if test nurse already exists
    const existingNurse = await Nurse.findOne({ nurseId: 'N0001' });
    if (existingNurse) {
      console.log('🔍 Test nurse N0001 already exists');
      console.log('Name:', existingNurse.name);
      console.log('Email:', existingNurse.email);
      console.log('Role:', existingNurse.role);
      console.log('Has password:', !!existingNurse.password);
      return;
    }

    // Create a simple test nurse for authentication testing
    const testNurse = new Nurse({
      nurseId: 'N0001',
      name: 'Test Nurse',
      email: 'test.nurse@hospital.com',
      role: 'staff_nurse',
      qualifications: ['Basic Care', 'Patient Monitoring'],
      wardAccess: ['General Ward'],
      yearsOfExperience: 2,
      workingConstraints: {
        maxConsecutiveNights: 2,
        maxWeeklyHours: 40,
        maxOvertimeHours: 8,
        minRestHours: 12
      },
      preferences: {
        shiftPreferences: ['DAY', 'EVENING'],
        wardPreferences: ['General Ward'],
        maxShiftsPerWeek: 5
      }
    });

    await testNurse.save();
    console.log('✅ Created test nurse N0001 successfully');
    console.log('Name:', testNurse.name);
    console.log('Email:', testNurse.email);
    console.log('Role:', testNurse.role);
    console.log('No password set (ready for signup)');

  } catch (error) {
    console.error('❌ Error creating test nurse:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
};

createTestNurse();