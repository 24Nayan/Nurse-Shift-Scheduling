// Simple test component for Add Nurse functionality
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export function SimpleAddNurseTest() {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleClick = () => {
    console.log('Button clicked!');
    alert('Add Nurse button works!');
    setIsOpen(true);
  };

  const handleApiTest = async () => {
    console.log('Testing API connection...');
    try {
      const response = await fetch('http://localhost:5000/api/nurses');
      const data = await response.json();
      console.log('API Response:', data);
      alert(`API Test Success! Found ${data.length} nurses`);
    } catch (error) {
      console.error('API Test Error:', error);
      alert('API Test Failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleAddNurseTest = async () => {
    console.log('Testing Add Nurse API...');
    try {
      const testNurse = {
        name: 'Test Nurse',
        email: 'test@example.com',
        qualifications: ['RN'],
        wardAccess: ['General'],
        yearsOfExperience: 5,
        role: 'Junior Nurse'
      };
      
      const response = await fetch('http://localhost:5000/api/nurses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testNurse),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Add Nurse Success:', data);
        alert('Add Nurse Test Success! Nurse ID: ' + data.nurseId);
      } else {
        const error = await response.text();
        console.error('Add Nurse Error:', error);
        alert('Add Nurse Test Failed: ' + error);
      }
    } catch (error) {
      console.error('Add Nurse Test Error:', error);
      alert('Add Nurse Test Failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Nurse Button Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>This is a comprehensive test for Add Nurse functionality</p>
        
        <div className="space-y-2">
          <Button onClick={handleClick} className="w-full">
            Test Basic Button
          </Button>
          
          <Button onClick={handleApiTest} className="w-full" variant="outline">
            Test API Connection (GET)
          </Button>
          
          <Button onClick={handleAddNurseTest} className="w-full" variant="secondary">
            Test Add Nurse API (POST)
          </Button>
        </div>

        <div>
          <p className="text-sm text-gray-600">Dialog state: {isOpen ? 'Open' : 'Closed'}</p>
          {isOpen && (
            <div className="mt-2 p-4 bg-gray-50 border rounded">
              <p>This would be the Add Nurse form!</p>
              <Button onClick={() => setIsOpen(false)} variant="outline" size="sm" className="mt-2">
                Close
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}