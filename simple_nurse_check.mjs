import http from 'http';

console.log('Testing API connection to get nurses...');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/nurses',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(`Status: ${res.statusCode}`);
      if (parsed.data && Array.isArray(parsed.data)) {
        console.log(`Found ${parsed.data.length} nurses in database`);
        if (parsed.data.length > 0) {
          console.log('Sample nurses:');
          parsed.data.slice(0, 3).forEach(nurse => {
            console.log(`- ${nurse.name} (${nurse.role}) - Ward Access: ${nurse.wardAccess?.join(', ') || 'None'}`);
          });
        } else {
          console.log('No nurses found in database - this is why demo nurses are being created');
        }
      } else {
        console.log('Unexpected response format:', parsed);
      }
    } catch (e) {
      console.log('Response parsing error:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error.message);
});

req.setTimeout(5000, () => {
  console.log('Request timed out');
  req.destroy();
});

req.end();