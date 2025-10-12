const http = require('http');

async function testScheduleGeneration() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            wardId: "68e4be02f47d09f3cd37c829", // ICU ward ID from previous test
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
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    console.log(`\n=== Schedule Generation Test ===`);
                    console.log(`Status Code: ${res.statusCode}`);
                    console.log(`Success: ${parsed.success}`);
                    
                    if (parsed.success && parsed.data && parsed.data.scheduleData) {
                        console.log(`Schedule ID: ${parsed.scheduleId}`);
                        console.log(`Number of days: ${parsed.data.scheduleData.length}`);
                        
                        // Check first day assignments
                        const firstDay = parsed.data.scheduleData[0];
                        console.log(`\nFirst Day (${firstDay.date}):`);
                        console.log(`  Day shift: ${firstDay.shifts?.day?.assignedNurses?.length || 0} nurses assigned`);
                        console.log(`  Evening shift: ${firstDay.shifts?.evening?.assignedNurses?.length || 0} nurses assigned`);
                        console.log(`  Night shift: ${firstDay.shifts?.night?.assignedNurses?.length || 0} nurses assigned`);
                        
                        if (firstDay.shifts?.day?.assignedNurses?.length > 0) {
                            console.log(`  Day nurses: ${firstDay.shifts.day.assignedNurses.map(n => n.nurseName).join(', ')}`);
                        }
                        if (firstDay.shifts?.evening?.assignedNurses?.length > 0) {
                            console.log(`  Evening nurses: ${firstDay.shifts.evening.assignedNurses.map(n => n.nurseName).join(', ')}`);
                        }
                        if (firstDay.shifts?.night?.assignedNurses?.length > 0) {
                            console.log(`  Night nurses: ${firstDay.shifts.night.assignedNurses.map(n => n.nurseName).join(', ')}`);
                        }
                        
                        // Check all days summary
                        console.log(`\nAll Days Summary:`);
                        parsed.data.scheduleData.forEach((day, index) => {
                            const dayTotal = (day.shifts?.day?.assignedNurses?.length || 0);
                            const eveningTotal = (day.shifts?.evening?.assignedNurses?.length || 0);
                            const nightTotal = (day.shifts?.night?.assignedNurses?.length || 0);
                            console.log(`  ${day.date}: Day(${dayTotal}) Evening(${eveningTotal}) Night(${nightTotal})`);
                        });
                        
                        resolve('SUCCESS');
                    } else {
                        console.log('Error in response:', parsed);
                        resolve('ERROR');
                    }
                } catch (e) {
                    console.log('Parse error:', e.message);
                    console.log('Raw response:', responseData);
                    resolve('PARSE_ERROR');
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

testScheduleGeneration()
    .then(result => {
        console.log(`\nTest completed with result: ${result}`);
        process.exit(0);
    })
    .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });