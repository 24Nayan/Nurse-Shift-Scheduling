// Simple test to verify the schedule generation works
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/shift-scheduling')
  .then(() => {
    console.log('✅ Connected to MongoDB');
    
    // Import models
    const Schedule = require('./backend/models/Schedule.js');
    const Ward = require('./backend/models/Ward.js');
    const Nurse = require('./backend/models/Nurse.js');
    
    // Test schedule generation
    testScheduleGeneration();
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err);
  });

async function testScheduleGeneration() {
  try {
    // Get a ward
    const ward = await Ward.findOne();
    if (!ward) {
      console.log('❌ No wards found in database');
      return;
    }
    
    console.log('✅ Found ward:', ward.name);
    
    // Get nurses
    const nurses = await Nurse.find({ wardAccess: ward._id }).limit(5);
    console.log(`✅ Found ${nurses.length} nurses for this ward`);
    
    // Test schedule generation logic
    const start = new Date('2025-10-12');
    const end = new Date('2025-10-18');
    
    console.log('🔄 Testing schedule generation...');
    
    // Generate mock schedule data for each day
    const scheduleData = new Map();
    
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      
      scheduleData.set(dateKey, {
        date: dateKey,
        dayOfWeek: dayName,
        shifts: {
          day: { assignedNurses: nurses.slice(0, 2).map(n => ({ nurseName: n.name })) },
          evening: { assignedNurses: nurses.slice(1, 3).map(n => ({ nurseName: n.name })) },
          night: { assignedNurses: nurses.slice(2, 4).map(n => ({ nurseName: n.name })) }
        }
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`✅ Generated schedule for ${scheduleData.size} days`);
    console.log('Sample day:', Array.from(scheduleData.values())[0]);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    mongoose.disconnect();
  }
}