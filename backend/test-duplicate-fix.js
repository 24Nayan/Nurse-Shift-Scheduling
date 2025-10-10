import mongoose from 'mongoose';
import Ward from './models/Ward.js';

async function testDuplicateNameFix() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/shift_scheduling');
    
    // First, create a test ward
    const testWardData = {
      name: 'Duplicate Test Ward',
      department: 'Emergency',
      description: 'Test ward for duplicate name testing',
      capacity: 20,
      dailyStaff: {
        nurses: 5,
        doctors: 2,
        support: 3
      },
      qualifications: ['RN', 'BLS'],
      patientTypes: ['emergency'],
      shiftRequirements: {
        day: { nurses: 3, doctors: 1, support: 2 },
        evening: { nurses: 2, doctors: 1, support: 1 },
        night: { nurses: 2, doctors: 0, support: 1 }
      },
      currentOccupancy: 0,
      location: 'Building A',
      minHierarchyLevel: 1
    };

    console.log('🆕 Creating initial test ward...');
    let ward1 = new Ward(testWardData);
    await ward1.save();
    console.log('✅ Created ward:', ward1.name, '(ID:', ward1._id + ')');

    console.log('🗑️  Soft deleting the ward...');
    ward1.isActive = false;
    await ward1.save();
    console.log('✅ Ward soft deleted');

    console.log('🔄 Attempting to create ward with same name...');
    let ward2 = new Ward(testWardData);
    await ward2.save();
    console.log('✅ SUCCESS! Created new ward with same name:', ward2.name, '(ID:', ward2._id + ')');

    console.log('🧪 Testing duplicate active ward prevention...');
    try {
      let ward3 = new Ward(testWardData);
      await ward3.save();
      console.log('❌ ERROR: Should not have been able to create duplicate active ward');
    } catch (error) {
      console.log('✅ Correctly prevented duplicate active ward:', error.message);
    }

    console.log('🧹 Cleaning up test data...');
    await Ward.deleteMany({ name: 'Duplicate Test Ward' });
    console.log('✅ Test data cleaned up');

    console.log('🎉 All tests passed! Duplicate name validation is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testDuplicateNameFix();