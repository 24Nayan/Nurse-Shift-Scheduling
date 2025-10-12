const http = require('http');

// Get existing wards
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/wards',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      console.log('Existing wards:', JSON.stringify(parsed, null, 2));
      
      if (parsed.success && parsed.data && parsed.data.length > 0) {
        // Use the first ward to test schedule generation
        testScheduleGeneration(parsed.data[0]._id);
      } else {
        console.log('No wards found');
      }
    } catch (e) {
      console.log('Raw response:', responseData);
    }
  });
});

function testScheduleGeneration(wardId) {
  console.log('\n--- Testing Schedule Generation ---');
  console.log('Using ward ID:', wardId);
  
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
        if (parsed.success && parsed.data && parsed.data.scheduleData) {
          console.log('Schedule generated successfully!');
          console.log('Schedule ID:', parsed.scheduleId);
          console.log('Number of days:', parsed.data.scheduleData.length);
          
          // Check the first day's assignments
          if (parsed.data.scheduleData.length > 0) {
            const firstDay = parsed.data.scheduleData[0];
            console.log('\nFirst day assignments:');
            console.log('Date:', firstDay.date);
            console.log('Day shift nurses:', firstDay.shifts?.day?.assignedNurses?.length || 0);
            console.log('Evening shift nurses:', firstDay.shifts?.evening?.assignedNurses?.length || 0);
            console.log('Night shift nurses:', firstDay.shifts?.night?.assignedNurses?.length || 0);
            
            if (firstDay.shifts?.day?.assignedNurses?.length > 0) {
              console.log('Day shift nurse names:', firstDay.shifts.day.assignedNurses.map(n => n.nurseName));
            }
          }
        } else {
          console.log('Schedule response:', JSON.stringify(parsed, null, 2));
        }
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

req.on('error', (error) => {
  console.error(error);
});

req.end();