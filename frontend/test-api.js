// Test API Connection
const testAPI = async () => {
  try {
    console.log('Testing API connection...');
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    console.log('API Response:', data);
    
    // Test nurses endpoint
    const nursesResponse = await fetch('http://localhost:5000/api/nurses');
    const nursesData = await nursesResponse.json();
    console.log('Nurses API Response:', nursesData);
    
  } catch (error) {
    console.error('API Test Failed:', error);
  }
};

// Run test
testAPI();