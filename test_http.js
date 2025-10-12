const http = require('http');

const postData = JSON.stringify({
  wardId: "673e7e7c6d2a3b1234567890",
  startDate: "2024-01-01", 
  endDate: "2024-01-07"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/schedules/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
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
      console.log('Response data:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(postData);
req.end();