const http = require('http');

// Get existing nurses
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/nurses',
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
      console.log('Existing nurses:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();