import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar, Clock, MapPin, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'charge_nurse' | 'staff_nurse';
  name: string;
  access_token: string;
}

interface NurseDashboardProps {
  user: User;
}

interface ShiftEntry {
  date: string;
  shift: string;
  wardId: string;
  wardName: string;
  nurseId: string;
  nurseName: string;
  role: string;
  assignedAt: string;
}

export function NurseDashboard({ user }: NurseDashboardProps) {
  const { apiCall } = useAuth();
  const [schedule, setSchedule] = useState<ShiftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleInfo, setScheduleInfo] = useState<any>(null);

  useEffect(() => {
    loadPersonalSchedule();
  }, []);

  const loadPersonalSchedule = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching personal schedule from backend...');
      
      const response = await apiCall('/schedules/my-schedule', {
        method: 'GET'
      });

      console.log('Personal schedule response:', response);

      if (response.success) {
        setSchedule(response.schedule || []);
        setScheduleInfo(response.scheduleInfo);
        console.log(`Loaded ${response.schedule?.length || 0} shifts for nurse`);
      } else {
        console.error('Failed to load schedule:', response.message);
        setError(response.message || 'Failed to load schedule');
      }
    } catch (error: any) {
      console.error('Schedule loading error:', error);
      setError(error.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const getShiftBadgeColor = (shift: string) => {
    const shiftLower = shift.toLowerCase();
    switch (shiftLower) {
      case 'day': return 'bg-yellow-100 text-yellow-800';
      case 'evening': return 'bg-orange-100 text-orange-800';
      case 'night': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getShiftTime = (shift: string) => {
    const shiftLower = shift.toLowerCase();
    switch (shiftLower) {
      case 'day': return '7:00 AM - 3:00 PM';
      case 'evening': return '3:00 PM - 11:00 PM';
      case 'night': return '11:00 PM - 7:00 AM';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const thisWeekShifts = schedule.filter(shift => {
    const shiftDate = new Date(shift.date);
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    return shiftDate >= weekStart && shiftDate <= weekEnd;
  });

  const upcomingShifts = thisWeekShifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    const today = new Date();
    return shiftDate >= today;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
            <p className="text-gray-600 mt-2">Welcome back, {user.name}</p>
            {scheduleInfo && (
              <p className="text-sm text-gray-500 mt-1">
                Schedule for {scheduleInfo.wardName} • 
                Generated on {new Date(scheduleInfo.generatedAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>
          <Button onClick={loadPersonalSchedule} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week's Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekShifts.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingShifts.length}</div>
            <p className="text-xs text-muted-foreground">Starting from today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">Ready for duty</p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Display */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>This Week's Schedule</CardTitle>
            <CardDescription>Your assigned shifts for the current week</CardDescription>
          </CardHeader>
          <CardContent>
            {thisWeekShifts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No shifts scheduled</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No shifts have been assigned for this week yet.
                </p>
                <Button 
                  className="mt-4"
                  onClick={loadPersonalSchedule}
                >
                  Refresh Schedule
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {thisWeekShifts
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((shift, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(shift.date)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {getShiftTime(shift.shift)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">{shift.wardName}</span>
                          </div>
                          <div className="flex items-center justify-end mt-1">
                            <Badge 
                              className={`text-xs ${getShiftBadgeColor(shift.shift)}`}
                              variant="secondary"
                            >
                              {shift.shift.charAt(0).toUpperCase() + shift.shift.slice(1)} Shift
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" disabled>
              <Clock className="mr-2 h-4 w-4" />
              Request Time Off (Coming Soon)
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <User className="mr-2 h-4 w-4" />
              Swap Shifts (Coming Soon)
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={loadPersonalSchedule}>
              <Calendar className="mr-2 h-4 w-4" />
              Refresh Schedule
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}