import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Calendar, Eye, Filter, Download, Clock, MapPin, User } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'charge_nurse' | 'staff_nurse';
  name: string;
  access_token: string;
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

interface ScheduleViewerProps {
  user: User;
}

export function ScheduleViewer({ user }: ScheduleViewerProps) {
  const [schedule, setSchedule] = useState<ShiftEntry[]>([]);
  const [filteredSchedule, setFilteredSchedule] = useState<ShiftEntry[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    ward: '',
    shift: '',
    nurse: ''
  });

  // Set default dates to current week
  useEffect(() => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    setStartDate(startOfWeek.toISOString().split('T')[0]);
    setEndDate(endOfWeek.toISOString().split('T')[0]);
    
    loadSchedule(startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [schedule, filters]);

  const loadSchedule = async (start?: string, end?: string) => {
    const searchStartDate = start || startDate;
    const searchEndDate = end || endDate;
    
    if (!searchStartDate || !searchEndDate) return;

    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c76fcf04/schedule?startDate=${searchStartDate}&endDate=${searchEndDate}`,
        {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSchedule(data.schedule || []);
      } else {
        const errorText = await response.text();
        console.error('Schedule fetch error:', errorText);
        setError('Failed to load schedule');
      }
    } catch (error) {
      console.error('Schedule loading error:', error);
      setError('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...schedule];

    if (filters.ward) {
      filtered = filtered.filter(entry => 
        entry.wardName.toLowerCase().includes(filters.ward.toLowerCase())
      );
    }

    if (filters.shift) {
      filtered = filtered.filter(entry => entry.shift === filters.shift);
    }

    if (filters.nurse) {
      filtered = filtered.filter(entry => 
        entry.nurseName.toLowerCase().includes(filters.nurse.toLowerCase())
      );
    }

    setFilteredSchedule(filtered);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSchedule();
  };

  const getShiftBadgeColor = (shift: string) => {
    switch (shift) {
      case 'day': return 'bg-yellow-100 text-yellow-800';
      case 'evening': return 'bg-orange-100 text-orange-800';
      case 'night': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'charge': return 'bg-blue-100 text-blue-800';
      case 'staff': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getUniqueValues = (key: keyof ShiftEntry) => {
    return [...new Set(schedule.map(entry => entry[key]))].sort();
  };

  const groupedByDate = filteredSchedule.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, ShiftEntry[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Eye className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Schedule Viewer</CardTitle>
                <CardDescription>View and filter nurse shift assignments</CardDescription>
              </div>
            </div>
            <Button variant="outline" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Date Range Selector */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="view-start-date">Start Date</Label>
                <Input
                  id="view-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="view-end-date">End Date</Label>
                <Input
                  id="view-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Load Schedule
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Filters */}
          <div className="border-t pt-6 mb-6">
            <div className="flex items-center mb-4">
              <Filter className="h-5 w-5 text-gray-600 mr-2" />
              <h3 className="font-medium">Filters</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-ward">Ward</Label>
                <select
                  id="filter-ward"
                  value={filters.ward}
                  onChange={(e) => setFilters(prev => ({ ...prev, ward: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Wards</option>
                  {getUniqueValues('wardName').map(ward => (
                    <option key={ward} value={ward}>{ward}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-shift">Shift</Label>
                <select
                  id="filter-shift"
                  value={filters.shift}
                  onChange={(e) => setFilters(prev => ({ ...prev, shift: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Shifts</option>
                  <option value="day">Day</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-nurse">Nurse</Label>
                <Input
                  id="filter-nurse"
                  type="text"
                  placeholder="Search by nurse name..."
                  value={filters.nurse}
                  onChange={(e) => setFilters(prev => ({ ...prev, nurse: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Schedule Display */}
          {filteredSchedule.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No schedule found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No shifts found for the selected date range and filters.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{filteredSchedule.length}</div>
                  <div className="text-sm text-blue-600">Total Shifts</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {new Set(filteredSchedule.map(s => s.nurseId)).size}
                  </div>
                  <div className="text-sm text-green-600">Nurses Assigned</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-orange-700">
                    {new Set(filteredSchedule.map(s => s.wardName)).size}
                  </div>
                  <div className="text-sm text-orange-600">Wards Covered</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {Object.keys(groupedByDate).length}
                  </div>
                  <div className="text-sm text-purple-600">Days Scheduled</div>
                </div>
              </div>

              {/* Schedule Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Ward</TableHead>
                      <TableHead>Nurse</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedule
                      .sort((a, b) => {
                        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
                        if (dateCompare !== 0) return dateCompare;
                        
                        const shiftOrder = { day: 0, evening: 1, night: 2 };
                        return (shiftOrder[a.shift as keyof typeof shiftOrder] || 3) - 
                               (shiftOrder[b.shift as keyof typeof shiftOrder] || 3);
                      })
                      .map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{formatDate(entry.date)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={`${getShiftBadgeColor(entry.shift)}`}
                              variant="secondary"
                            >
                              {entry.shift.charAt(0).toUpperCase() + entry.shift.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>{entry.wardName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>{entry.nurseName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={`${getRoleBadgeColor(entry.role)}`}
                              variant="secondary"
                            >
                              {entry.role === 'charge' ? 'Charge Nurse' : 'Staff Nurse'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(entry.assignedAt).toLocaleDateString()}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}