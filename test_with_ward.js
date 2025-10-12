const http = require('http');

// First, let's create a test ward
const wardData = JSON.stringify({
  name: "ICU",
  department: "Critical Care",
  description: "Intensive Care Unit",
  capacity: 30,
  dailyStaff: {
    nurses: 10,
    doctors: 3,
    support: 2
  },
  qualifications: ["RN", "BSN", "ACLS", "BLS"],
  patientTypes: ["critical", "trauma"],
  shiftRequirements: {
    day: {
      nurses: 3,
      doctors: 1,
      support: 1
    },
    evening: {
      nurses: 2,
      doctors: 1,
      support: 1
    },
    night: {
      nurses: 1,
      doctors: 0,
      support: 0
    }
  }
});

const wardOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/wards',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(wardData)
  }
};

const wardReq = http.request(wardOptions, (res) => {
  console.log(`Ward creation statusCode: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      console.log('Ward created:', parsed);
      
      if (parsed.success && parsed.data && parsed.data._id) {
        // Now use this ward ID to generate a schedule
        testScheduleGeneration(parsed.data._id);
      }
    } catch (e) {
      console.log('Raw ward response:', responseData);
    }
  });
});

function testScheduleGeneration(wardId) {
  const scheduleData = JSON.stringify({
    wardId: wardId,
    startDate: "2024-01-01",
    endDate: "2024-01-07"
  });

  const scheduleOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/schedules/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(scheduleData)
    }
  };

  const scheduleReq = http.request(scheduleOptions, (res) => {
    console.log(`Schedule generation statusCode: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        console.log('Schedule response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Raw schedule response:', responseData);
      }
    });
  });

  scheduleReq.on('error', (error) => {
    console.error('Schedule request error:', error);
  });

  scheduleReq.write(scheduleData);
  scheduleReq.end();
}

wardReq.on('error', (error) => {
  console.error('Ward request error:', error);
});

wardReq.write(wardData);
wardReq.end();