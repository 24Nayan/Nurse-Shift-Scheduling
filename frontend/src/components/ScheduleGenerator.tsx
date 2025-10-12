import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar, Settings, Zap, CheckCircle, AlertCircle, Building } from 'lucide-react';
import { apiService, Ward } from '../utils/api';

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

export function ScheduleGenerator({ onScheduleGenerated }: ScheduleGeneratorProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(false);
  const [wardsLoading, setWardsLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [lastGenerated, setLastGenerated] = useState<any>(null);

  // Set default dates to current week and load wards
  useEffect(() => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    setStartDate(startOfWeek.toISOString().split('T')[0]);
    setEndDate(endOfWeek.toISOString().split('T')[0]);
    
    loadWards();
  }, []);

  const loadWards = async () => {
    try {
      setWardsLoading(true);
      const response = await apiService.getWards();
      if (response.success && response.data && Array.isArray(response.data)) {
        setWards(response.data);
        // Auto-select first ward if available
        if (response.data.length > 0) {
          setSelectedWard(response.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to load wards:', error);
      setError('Failed to load wards. Please refresh the page.');
    } finally {
      setWardsLoading(false);
    }
  };

  const generateSchedule = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('Generate Schedule button clicked'); // Debug log
    
    if (!selectedWard) {
      setError('Please select a ward');
      return;
    }
    
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

    console.log('Starting schedule generation...', { wardId: selectedWard, startDate, endDate });
    console.log('API Service base URL:', apiService);

    try {
      console.log('About to call direct fetch to backend...');
      
      // Direct fetch call to bypass any potential apiService issues
      const response = await fetch('http://localhost:5000/api/schedules/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wardId: selectedWard,
          startDate,
          endDate,
          settings: {
            maxConsecutiveNights: 3,
            maxWeeklyHours: 48,
            enforceAvailability: true,
            generations: 200,
            populationSize: 50
          }
        })
      });
      
      console.log('Raw response:', response);
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      // Convert to expected format
      const apiResponse = {
        success: responseData.success,
        data: responseData.data,
        message: responseData.message,
        error: responseData.error,
        generationStats: responseData.generationStats
      };

      console.log('API Response:', apiResponse);
      
      if (apiResponse.success && apiResponse.data) {
        setLastGenerated(apiResponse.data);
        const selectedWardName = wards.find(w => w._id === selectedWard)?.name || 'Selected Ward';
        setSuccess(`Schedule generated successfully for ${selectedWardName}! Quality Score: ${(apiResponse as any).generationStats?.qualityScore?.toFixed(1) || 'N/A'}%`);
        console.log('Schedule generation completed successfully');
        // Temporarily disable callback to prevent navigation issues
        console.log('Schedule generation successful - callback disabled for debugging');
        // if (onScheduleGenerated) {
        //   console.log('Calling onScheduleGenerated callback');
        //   onScheduleGenerated();
        // }
      } else {
        console.log('Schedule generation failed:', apiResponse);
        setError(apiResponse.error || apiResponse.message || 'Failed to generate schedule');
      }
    } catch (error: any) {
      console.error('Schedule generation error:', error);
      console.error('Error details:', error);
      setError(error.message || 'Failed to generate schedule. Please try again.');
    } finally {
      console.log('Setting loading to false');
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
          <div className="space-y-6">
            {/* Ward Selection */}
            <div className="space-y-2">
              <Label htmlFor="ward-select">Select Ward</Label>
              {wardsLoading ? (
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Loading wards...</span>
                </div>
              ) : (
                <Select value={selectedWard} onValueChange={setSelectedWard}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a ward to generate schedule for">
                      {selectedWard && (
                        <div className="flex items-center">
                          <Building className="mr-2 h-4 w-4" />
                          {wards.find(w => w._id === selectedWard)?.name}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-md z-50">
                    {wards.map((ward) => (
                      <SelectItem 
                        key={ward._id} 
                        value={ward._id}
                        className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer p-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center">
                          <Building className="mr-2 h-4 w-4 text-gray-600" />
                          <div>
                            <div className="font-medium text-gray-900">{ward.name}</div>
                            <div className="text-xs text-gray-500">{ward.department}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

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
              type="button"
              onClick={generateSchedule}
              className="w-full" 
              disabled={loading || !selectedWard || wardsLoading}
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
          </div>
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
                    Maximum consecutive night shifts (≤3)
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Weekly working hour limits (≤48hrs)
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Nurse availability preferences
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Fair workload distribution
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Ward coverage requirements
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-3">Genetic Algorithm Process</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2 mt-0.5">1</span>
                    <span>Generate 50 random schedule populations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2 mt-0.5">2</span>
                    <span>Evaluate fitness: coverage, fairness, preferences</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2 mt-0.5">3</span>
                    <span>Apply crossover and mutation operators</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded mr-2 mt-0.5">4</span>
                    <span>Evolve for 200 generations to optimal solution</span>
                  </li>
                </ul>
              </div>
            </div>

            {lastGenerated && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-4">Last Generated Schedule</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-blue-700">Period:</span>
                    <p className="font-medium">{lastGenerated.startDate ? new Date(lastGenerated.startDate).toLocaleDateString() : 'N/A'} - {lastGenerated.endDate ? new Date(lastGenerated.endDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Quality Score:</span>
                    <p className="font-medium">{lastGenerated.qualityMetrics?.overallScore?.toFixed(1) || 'N/A'}%</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Generated:</span>
                    <p className="font-medium">{lastGenerated.generatedAt ? new Date(lastGenerated.generatedAt).toLocaleTimeString() : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Status:</span>
                    <p className="font-medium text-green-600">{lastGenerated.status || 'Draft'}</p>
                  </div>
                </div>
                
                {/* Schedule Data Display */}
                {lastGenerated.scheduleData && Object.keys(lastGenerated.scheduleData).length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-lg font-semibold text-blue-900 mb-3">Weekly Schedule</h5>
                    <div className="overflow-x-auto shadow-sm">
                      <table className="min-w-full bg-white border border-gray-200 rounded-lg text-sm">
                        <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Day</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Day (7-15)</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Evening (15-23)</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Night (23-7)</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Coverage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Object.entries(lastGenerated.scheduleData).map(([date, dayData]: [string, any]) => (
                            <tr key={date} className="hover:bg-blue-50 transition-colors">
                              <td className="px-3 py-3 text-sm font-medium text-gray-900">{new Date(date).toLocaleDateString()}</td>
                              <td className="px-3 py-3 text-sm text-gray-600 font-medium">{dayData.dayOfWeek}</td>
                              <td className="px-3 py-3 text-sm">
                                <div className="text-sm space-y-1">
                                  {dayData.shifts?.day?.assignedNurses?.length > 0 ? 
                                    dayData.shifts.day.assignedNurses.map((nurse: any, idx: number) => (
                                      <div key={idx} className="text-gray-800 font-medium bg-green-50 px-2 py-1 rounded text-xs">
                                        {nurse.nurseName}
                                      </div>
                                    )) : 
                                    <span className="text-red-500 italic text-xs">No assignments</span>
                                  }
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm">
                                <div className="text-sm space-y-1">
                                  {dayData.shifts?.evening?.assignedNurses?.length > 0 ? 
                                    dayData.shifts.evening.assignedNurses.map((nurse: any, idx: number) => (
                                      <div key={idx} className="text-gray-800 font-medium bg-blue-50 px-2 py-1 rounded text-xs">
                                        {nurse.nurseName}
                                      </div>
                                    )) : 
                                    <span className="text-red-500 italic text-xs">No assignments</span>
                                  }
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm">
                                <div className="text-sm space-y-1">
                                  {dayData.shifts?.night?.assignedNurses?.length > 0 ? 
                                    dayData.shifts.night.assignedNurses.map((nurse: any, idx: number) => (
                                      <div key={idx} className="text-gray-800 font-medium bg-purple-50 px-2 py-1 rounded text-xs">
                                        {nurse.nurseName}
                                      </div>
                                    )) : 
                                    <span className="text-red-500 italic text-xs">No assignments</span>
                                  }
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${dayData.coveragePercentage >= 95 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {dayData.coveragePercentage?.toFixed(0) || 'N/A'}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Statistics */}
                {lastGenerated.qualityMetrics?.statistics && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white p-3 rounded border">
                      <span className="text-gray-600">Total Shifts:</span>
                      <p className="font-medium text-lg">{lastGenerated.qualityMetrics.statistics.totalShifts}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <span className="text-gray-600">Nurses Scheduled:</span>
                      <p className="font-medium text-lg">{lastGenerated.qualityMetrics.statistics.totalNursesScheduled || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <span className="text-gray-600">Avg Hours/Nurse:</span>
                      <p className="font-medium text-lg">{lastGenerated.qualityMetrics.statistics.averageHoursPerNurse || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <span className="text-gray-600">Generation Time:</span>
                      <p className="font-medium text-lg">{(lastGenerated.qualityMetrics.generationTime / 1000)?.toFixed(1) || 'N/A'}s</p>
                    </div>
                  </div>
                )}
                
                {lastGenerated.issues && lastGenerated.issues.length > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400">
                    <p className="text-yellow-800 text-sm">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      {lastGenerated.issues.length} constraint violation(s) detected
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}