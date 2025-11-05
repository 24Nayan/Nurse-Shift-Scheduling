// Debug script to check unavailability requests and nurse IDs
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Nurse from './models/Nurse.js';
import UnavailabilityRequest from './models/UnavailabilityRequest.js';

dotenv.config();

const debugUnavailability = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nurse-scheduling');
    console.log('✅ Connected to MongoDB\n');

    // Find the nurse30 user
    const nurse = await Nurse.findOne({ nurseId: 'N1030' });
    if (!nurse) {
      console.log('❌ Nurse N1030 not found!');
      process.exit(1);
    }

    console.log('👤 Nurse N1030 (nurse30) Details:');
    console.log(`   Name: ${nurse.name}`);
    console.log(`   NurseId (code): ${nurse.nurseId}`);
    console.log(`   MongoDB _id: ${nurse._id}`);
    console.log(`   Role: ${nurse.role}`);
    console.log('');

    // Find all unavailability requests for this nurse
    const requests = await UnavailabilityRequest.find({ 
      nurseId: nurse._id 
    });

    console.log(`📋 Found ${requests.length} unavailability requests for N1030 (nurse30):\n`);

    requests.forEach((req, index) => {
      console.log(`Request #${index + 1}:`);
      console.log(`   RequestId: ${req.requestId}`);
      console.log(`   Status: ${req.status}`);
      console.log(`   NurseId (stored): ${req.nurseId}`);
      console.log(`   NurseId matches: ${req.nurseId.toString() === nurse._id.toString()}`);
      console.log(`   Valid From: ${req.validFrom}`);
      console.log(`   Valid Until: ${req.validUntil}`);
      console.log(`   Unavailable Dates:`);
      req.unavailableDates.forEach(dateItem => {
        console.log(`      - ${dateItem.dateString || new Date(dateItem.date).toISOString().split('T')[0]}`);
        console.log(`        Shifts: ${dateItem.shifts.join(', ')}`);
        console.log(`        Date object: ${dateItem.date}`);
      });
      console.log('');
    });

    // Check approved requests
    const approvedRequests = requests.filter(r => r.status === 'approved');
    console.log(`✅ ${approvedRequests.length} of these requests are APPROVED`);
    
    if (approvedRequests.length > 0) {
      console.log('\n🔒 These are the constraints that should block scheduling:');
      approvedRequests.forEach(req => {
        req.unavailableDates.forEach(dateItem => {
          const dateString = dateItem.dateString || new Date(dateItem.date).toISOString().split('T')[0];
          dateItem.shifts.forEach(shift => {
            const key = `${dateString}-${shift}`;
            console.log(`   ❌ ${nurse.name} BLOCKED on ${key}`);
          });
        });
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

debugUnavailability();
