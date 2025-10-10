import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar, Settings, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'charge_nurse' | 'staff_nurse';
  name: string;
  access_token: string;
}

interface ScheduleGeneratorProps {
  user: User;
  onScheduleGenerated?: () => void;
}

export function ScheduleGenerator({ user, onScheduleGenerated }: ScheduleGeneratorProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [lastGenerated, setLastGenerated] = useState<any>(null);

  // Set default dates to current week
  React.useEffect(() => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    setStartDate(startOfWeek.toISOString().split('T')[0]);
    setEndDate(endOfWeek.toISOString().split('T')[0]);
  }, []);

  const generateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c76fcf04/generate-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (response.ok) {
        const result = await response.json();
        setLastGenerated(result);
        setSuccess(`Schedule generated successfully! Created ${result.schedule.length} shift assignments.`);
        if (onScheduleGenerated) {
          onScheduleGenerated();
        }
      } else {
        const errorText = await response.text();
        console.error('Schedule generation error:', errorText);
        setError(`Failed to generate schedule: ${errorText}`);
      }
    } catch (error) {
      console.error('Schedule generation error:', error);
      setError('Failed to generate schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateThisWeek = () => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    setStartDate(startOfWeek.toISOString().split('T')[0]);
    setEndDate(endOfWeek.toISOString().split('T')[0]);
  };

  const generateNextWeek = () => {
    const today = new Date();
    const startOfNextWeek = new Date(today.setDate(today.getDate() - today.getDay() + 7));
    const endOfNextWeek = new Date(today.setDate(today.getDate() - today.getDay() + 13));
    
    setStartDate(startOfNextWeek.toISOString().split('T')[0]);
    setEndDate(endOfNextWeek.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Zap className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Schedule Generator</CardTitle>
              <CardDescription>Generate optimal nurse schedules using AI-powered algorithms</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={generateSchedule} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Quick Date Selectors */}
            <div className="flex space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={generateThisWeek}
              >
                This Week
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={generateNextWeek}
              >
                Next Week
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Schedule...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Generate Schedule
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Algorithm Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Settings className="h-5 w-5 text-gray-600" />
            <div>
              <CardTitle className="text-lg">Scheduling Algorithm</CardTitle>
              <CardDescription>How the optimal schedule is generated</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Optimization Factors</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Nurse qualifications and certifications
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Ward access permissions
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Hierarchy level requirements
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Nurse availability preferences
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Ward staffing requirements
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-3">Assignment Process</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2 mt-0.5">1</span>
                    <span>Assign charge nurses to each ward shift</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2 mt-0.5">2</span>
                    <span>Match qualified staff nurses to remaining slots</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2 mt-0.5">3</span>
                    <span>Balance workload across all nurses</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2 mt-0.5">4</span>
                    <span>Ensure compliance with regulations</span>
                  </li>
                </ul>
              </div>
            </div>

            {lastGenerated && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Last Generated Schedule</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Period:</span>
                    <p className="font-medium">{new Date(lastGenerated.schedule[0]?.date || '').toLocaleDateString()} - {new Date(lastGenerated.schedule[lastGenerated.schedule.length - 1]?.date || '').toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Total Shifts:</span>
                    <p className="font-medium">{lastGenerated.schedule.length}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Generated:</span>
                    <p className="font-medium">{new Date(lastGenerated.generatedAt || '').toLocaleTimeString()}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Status:</span>
                    <p className="font-medium text-green-600">Active</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}