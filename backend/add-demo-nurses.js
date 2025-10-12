// Demo nurses creation script
import mongoose from 'mongoose';

// Import models (adjust path as needed)
import Nurse from './models/Nurse.js';
import Ward from './models/Ward.js';

async function addDemoNurses() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/shift-scheduling');
    console.log('✅ Connected to MongoDB');

    // Get ICU ward ID
    const icuWard = await Ward.findOne({ name: 'ICU' });
    if (!icuWard) {
      console.log('❌ ICU ward not found');
      return;
    }
    
    console.log('✅ Found ICU ward with ID:', icuWard._id);

    // Check existing nurses
    const existingNurses = await Nurse.find({ wardAccess: icuWard._id });
    console.log(`📊 Found ${existingNurses.length} existing nurses with ICU access`);

    // Create demo nurses for ICU ward
    const demoNurses = [
      {
        email: 'sarah.johnson@hospital.com',
        name: 'Sarah Johnson',
        nurseId: 'N001',
        role: 'charge_nurse',
        qualifications: ['BSN', 'MSN', 'CEN'],
        wardAccess: [icuWard._id],
        hierarchyLevel: 3,
        yearsOfExperience: 8,
        workingConstraints: {
          maxConsecutiveNights: 3,
          maxWeeklyHours: 48,
          maxOvertimeHours: 12,
          minRestHours: 11,
          maxConsecutiveDays: 5,
          minDaysOffPerWeek: 2
        },
        availability: {
          monday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          tuesday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          wednesday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          thursday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          friday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          saturday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          sunday: { available: false, preferredShifts: [], unavailableShifts: ['day', 'evening', 'night'] }
        }
      },
      {
        email: 'michael.chen@hospital.com',
        name: 'Michael Chen',
        nurseId: 'N002',
        role: 'staff_nurse',
        qualifications: ['BSN', 'CCRN'],
        wardAccess: [icuWard._id],
        hierarchyLevel: 2,
        yearsOfExperience: 5,
        workingConstraints: {
          maxConsecutiveNights: 2,
          maxWeeklyHours: 40,
          maxOvertimeHours: 8,
          minRestHours: 11,
          maxConsecutiveDays: 4,
          minDaysOffPerWeek: 2
        },
        availability: {
          monday: { available: true, preferredShifts: ['evening', 'night'], unavailableShifts: [] },
          tuesday: { available: true, preferredShifts: ['evening', 'night'], unavailableShifts: [] },
          wednesday: { available: true, preferredShifts: ['evening', 'night'], unavailableShifts: [] },
          thursday: { available: true, preferredShifts: ['evening', 'night'], unavailableShifts: [] },
          friday: { available: true, preferredShifts: ['evening', 'night'], unavailableShifts: [] },
          saturday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          sunday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] }
        }
      },
      {
        email: 'emily.davis@hospital.com',
        name: 'Emily Davis',
        nurseId: 'N003',
        role: 'staff_nurse',
        qualifications: ['BSN', 'BLS'],
        wardAccess: [icuWard._id],
        hierarchyLevel: 2,
        yearsOfExperience: 3,
        workingConstraints: {
          maxConsecutiveNights: 2,
          maxWeeklyHours: 36,
          maxOvertimeHours: 4,
          minRestHours: 12,
          maxConsecutiveDays: 4,
          minDaysOffPerWeek: 2
        },
        availability: {
          monday: { available: true, preferredShifts: ['day'], unavailableShifts: ['night'] },
          tuesday: { available: true, preferredShifts: ['day'], unavailableShifts: ['night'] },
          wednesday: { available: true, preferredShifts: ['day'], unavailableShifts: ['night'] },
          thursday: { available: true, preferredShifts: ['day'], unavailableShifts: ['night'] },
          friday: { available: true, preferredShifts: ['day'], unavailableShifts: ['night'] },
          saturday: { available: false, preferredShifts: [], unavailableShifts: ['day', 'evening', 'night'] },
          sunday: { available: false, preferredShifts: [], unavailableShifts: ['day', 'evening', 'night'] }
        }
      },
      {
        email: 'james.wilson@hospital.com',
        name: 'James Wilson',
        nurseId: 'N004',
        role: 'staff_nurse',
        qualifications: ['BSN', 'NRP'],
        wardAccess: [icuWard._id],
        hierarchyLevel: 2,
        yearsOfExperience: 6,
        workingConstraints: {
          maxConsecutiveNights: 3,
          maxWeeklyHours: 44,
          maxOvertimeHours: 8,
          minRestHours: 11,
          maxConsecutiveDays: 5,
          minDaysOffPerWeek: 2
        },
        availability: {
          monday: { available: true, preferredShifts: ['night'], unavailableShifts: [] },
          tuesday: { available: true, preferredShifts: ['night'], unavailableShifts: [] },
          wednesday: { available: true, preferredShifts: ['night'], unavailableShifts: [] },
          thursday: { available: true, preferredShifts: ['night'], unavailableShifts: [] },
          friday: { available: true, preferredShifts: ['night'], unavailableShifts: [] },
          saturday: { available: true, preferredShifts: ['evening', 'night'], unavailableShifts: [] },
          sunday: { available: true, preferredShifts: ['evening', 'night'], unavailableShifts: [] }
        }
      },
      {
        email: 'lisa.martinez@hospital.com',
        name: 'Lisa Martinez',
        nurseId: 'N005',
        role: 'staff_nurse',
        qualifications: ['BSN', 'ACLS'],
        wardAccess: [icuWard._id],
        hierarchyLevel: 2,
        yearsOfExperience: 4,
        workingConstraints: {
          maxConsecutiveNights: 2,
          maxWeeklyHours: 40,
          maxOvertimeHours: 6,
          minRestHours: 11,
          maxConsecutiveDays: 4,
          minDaysOffPerWeek: 2
        },
        availability: {
          monday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          tuesday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          wednesday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          thursday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          friday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          saturday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] },
          sunday: { available: true, preferredShifts: ['day', 'evening'], unavailableShifts: [] }
        }
      }
    ];

    // Insert nurses if they don't exist
    for (const nurseData of demoNurses) {
      const existingNurse = await Nurse.findOne({ email: nurseData.email });
      if (!existingNurse) {
        const nurse = new Nurse(nurseData);
        await nurse.save();
        console.log(`✅ Created nurse: ${nurseData.name}`);
      } else {
        console.log(`⚠️  Nurse already exists: ${nurseData.name}`);
      }
    }

    // Verify ICU nurses
    const icuNurses = await Nurse.find({ wardAccess: icuWard._id });
    console.log(`✅ Total ICU nurses: ${icuNurses.length}`);
    icuNurses.forEach(nurse => {
      console.log(`  - ${nurse.name} (${nurse.role})`);
    });

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

// Run the script
addDemoNurses();