const fetch = require('node-fetch');

async function testScheduleGeneration() {
    try {
        const response = await fetch('http://localhost:5000/api/schedules/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ward: '673e7e7c6d2a3b1234567890',
                startDate: '2024-01-01',
                endDate: '2024-01-07'
            })
        });

        const data = await response.json();
        console.log('Schedule generation response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error testing schedule generation:', error);
    }
}

testScheduleGeneration();