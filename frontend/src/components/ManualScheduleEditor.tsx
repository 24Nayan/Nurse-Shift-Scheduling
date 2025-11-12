import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  Save,
  RefreshCw,
  Trash2,
  ArrowLeftRight,
  Edit3,
  CheckCircle
} from 'lucide-react';

interface Nurse {
  nurseId: string;
  nurseName: string;
  role?: string;
  specialization?: string;
  hours?: number;
  isFloating?: boolean;
  overtime?: boolean;
  preference?: string;
}

interface ShiftData {
  assignedNurses: Nurse[];
  requiredNurses: number;
  requiredChargeNurses: number;
  coverage: number;
}

interface DaySchedule {
  date: string;
  dayOfWeek: string;
  shifts: {
    day: ShiftData;
    evening: ShiftData;
    night: ShiftData;
  };
}

interface Schedule {
  _id: string;
  ward: string;
  wardName: string;
  startDate: string;
  endDate: string;
  scheduleData: DaySchedule[];
  status: string;
  createdAt?: string;
}

const ManualScheduleEditor = () => {
  const { apiCall } = useAuth() as any;
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [editedSchedule, setEditedSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedNurse, setSelectedNurse] = useState<{ nurse: Nurse; date: string; shift: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddNurseModal, setShowAddNurseModal] = useState(false);
  const [addNurseData, setAddNurseData] = useState<{ date: string; shift: string; nurseId: string }>({ date: '', shift: '', nurseId: '' });

  useEffect(() => {
    loadWards();
  }, []);

  useEffect(() => {
    if (selectedWard) {
      loadSchedules();
    }
  }, [selectedWard]);

  const loadWards = async () => {
    try {
      const response = await apiCall('/wards', { method: 'GET' });
      if (response.success) {
        setWards(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load wards:', error);
      setError('Failed to load wards');
    }
  };

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiCall(`/schedules?ward=${selectedWard}`, { method: 'GET' });
      
      if (response.success) {
        // Sort by createdAt descending and take only the latest one
        const sortedSchedules = (response.data || []).sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        // Show only the latest schedule
        const latestSchedule = sortedSchedules.length > 0 ? [sortedSchedules[0]] : [];
        
        setSchedules(latestSchedule);
        console.log(`Loaded latest schedule for ward`);
      } else {
        setError(response.message || 'Failed to load schedules');
      }
    } catch (error: any) {
      console.error('Failed to load schedules:', error);
      setError(error.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const loadScheduleForEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    
    // Transform scheduleData from Map to Array
    const transformedSchedule = JSON.parse(JSON.stringify(schedule));
    
    // Convert scheduleData Map to Array if it's an object
    if (transformedSchedule.scheduleData && typeof transformedSchedule.scheduleData === 'object' && !Array.isArray(transformedSchedule.scheduleData)) {
      const scheduleArray: DaySchedule[] = [];
      
      // Convert Map/Object to Array
      Object.keys(transformedSchedule.scheduleData).forEach(dateKey => {
        const dayData = transformedSchedule.scheduleData[dateKey];
        
        // Get day of week from date
        const date = new Date(dateKey);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        scheduleArray.push({
          date: dateKey,
          dayOfWeek: dayOfWeek,
          shifts: {
            day: {
              assignedNurses: dayData.shifts?.DAY?.nurses || [],
              requiredNurses: dayData.shifts?.DAY?.requiredNurses || 0,
              requiredChargeNurses: dayData.shifts?.DAY?.requiredChargeNurses || 0,
              coverage: dayData.shifts?.DAY?.coverage || 0
            },
            evening: {
              assignedNurses: dayData.shifts?.EVENING?.nurses || [],
              requiredNurses: dayData.shifts?.EVENING?.requiredNurses || 0,
              requiredChargeNurses: dayData.shifts?.EVENING?.requiredChargeNurses || 0,
              coverage: dayData.shifts?.EVENING?.coverage || 0
            },
            night: {
              assignedNurses: dayData.shifts?.NIGHT?.nurses || [],
              requiredNurses: dayData.shifts?.NIGHT?.requiredNurses || 0,
              requiredChargeNurses: dayData.shifts?.NIGHT?.requiredChargeNurses || 0,
              coverage: dayData.shifts?.NIGHT?.coverage || 0
            }
          }
        });
      });
      
      // Sort by date
      scheduleArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      transformedSchedule.scheduleData = scheduleArray;
    }
    
    setEditedSchedule(transformedSchedule);
    setHasChanges(false);
    setSuccess('');
    setError('');
    console.log('Loaded schedule for editing:', schedule._id);
  };

  const handleNurseClick = (nurse: Nurse, date: string, shift: string) => {
    if (selectedNurse && 
        selectedNurse.nurse.nurseId === nurse.nurseId && 
        selectedNurse.date === date && 
        selectedNurse.shift === shift) {
      // Deselect if clicking the same nurse
      setSelectedNurse(null);
    } else {
      setSelectedNurse({ nurse, date, shift });
    }
  };

  const moveNurseToShift = (targetDate: string, targetShift: string) => {
    if (!selectedNurse || !editedSchedule) return;

    const newSchedule = JSON.parse(JSON.stringify(editedSchedule));
    
    // Find source day and shift
    const sourceDayIndex = newSchedule.scheduleData.findIndex((d: DaySchedule) => d.date === selectedNurse.date);
    const targetDayIndex = newSchedule.scheduleData.findIndex((d: DaySchedule) => d.date === targetDate);
    
    if (sourceDayIndex === -1 || targetDayIndex === -1) return;

    const sourceShiftKey = selectedNurse.shift.toLowerCase() as 'day' | 'evening' | 'night';
    const targetShiftKey = targetShift.toLowerCase() as 'day' | 'evening' | 'night';

    // Remove from source
    const sourceNurses = newSchedule.scheduleData[sourceDayIndex].shifts[sourceShiftKey].assignedNurses;
    const nurseIndex = sourceNurses.findIndex((n: Nurse) => n.nurseId === selectedNurse.nurse.nurseId);
    
    if (nurseIndex !== -1) {
      const [removedNurse] = sourceNurses.splice(nurseIndex, 1);
      
      // Add to target
      newSchedule.scheduleData[targetDayIndex].shifts[targetShiftKey].assignedNurses.push(removedNurse);
      
      setEditedSchedule(newSchedule);
      setHasChanges(true);
      setSelectedNurse(null);
      setSuccess(`Moved ${removedNurse.nurseName} to ${targetDate} ${targetShift} shift`);
      
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const removeNurseFromShift = (date: string, shift: string, nurseId: string) => {
    if (!editedSchedule) return;

    const newSchedule = JSON.parse(JSON.stringify(editedSchedule));
    const dayIndex = newSchedule.scheduleData.findIndex((d: DaySchedule) => d.date === date);
    
    if (dayIndex === -1) return;

    const shiftKey = shift.toLowerCase() as 'day' | 'evening' | 'night';
    const nurses = newSchedule.scheduleData[dayIndex].shifts[shiftKey].assignedNurses;
    const nurseIndex = nurses.findIndex((n: Nurse) => n.nurseId === nurseId);
    
    if (nurseIndex !== -1) {
      const [removedNurse] = nurses.splice(nurseIndex, 1);
      setEditedSchedule(newSchedule);
      setHasChanges(true);
      setSuccess(`Removed ${removedNurse.nurseName} from ${date} ${shift} shift`);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const openAddNurseModal = (date: string, shift: string) => {
    setAddNurseData({ date, shift, nurseId: '' });
    setShowAddNurseModal(true);
  };

  const addNurseToShift = async () => {
    if (!editedSchedule || !addNurseData.nurseId.trim()) {
      setError('Please enter a valid Nurse ID');
      return;
    }

    try {
      // Fetch nurse details by nurseId
      const response = await apiCall(`/nurses?nurseId=${addNurseData.nurseId}`, { method: 'GET' });
      
      if (!response.success || !response.data || response.data.length === 0) {
        setError(`Nurse with ID "${addNurseData.nurseId}" not found`);
        return;
      }

      const nurse = response.data[0];
      
      // Check if nurse is already assigned to this shift
      const newSchedule = JSON.parse(JSON.stringify(editedSchedule));
      const dayIndex = newSchedule.scheduleData.findIndex((d: DaySchedule) => d.date === addNurseData.date);
      
      if (dayIndex === -1) {
        setError('Invalid date');
        return;
      }

      const shiftKey = addNurseData.shift.toLowerCase() as 'day' | 'evening' | 'night';
      const nurses = newSchedule.scheduleData[dayIndex].shifts[shiftKey].assignedNurses;
      
      // Check if nurse already assigned
      if (nurses.some((n: Nurse) => n.nurseId === nurse._id)) {
        setError(`${nurse.name} is already assigned to this shift`);
        return;
      }

      // Add nurse to shift
      nurses.push({
        nurseId: nurse._id,
        nurseName: nurse.name,
        role: nurse.role,
        hours: 8
      });

      setEditedSchedule(newSchedule);
      setHasChanges(true);
      setSuccess(`Added ${nurse.name} to ${addNurseData.date} ${addNurseData.shift} shift`);
      setShowAddNurseModal(false);
      setAddNurseData({ date: '', shift: '', nurseId: '' });
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Failed to add nurse:', error);
      setError(error.message || 'Failed to add nurse');
    }
  };

  const saveSchedule = async () => {
    if (!editedSchedule) return;

    try {
      setSaving(true);
      setError('');
      
      // Convert scheduleData array back to Map/Object for backend
      const scheduleDataMap: any = {};
      
      if (Array.isArray(editedSchedule.scheduleData)) {
        editedSchedule.scheduleData.forEach((dayData: DaySchedule) => {
          scheduleDataMap[dayData.date] = {
            shifts: {
              DAY: {
                nurses: dayData.shifts.day.assignedNurses,
                requiredNurses: dayData.shifts.day.requiredNurses,
                requiredChargeNurses: dayData.shifts.day.requiredChargeNurses,
                actualNurses: dayData.shifts.day.assignedNurses.length,
                coverage: dayData.shifts.day.coverage
              },
              EVENING: {
                nurses: dayData.shifts.evening.assignedNurses,
                requiredNurses: dayData.shifts.evening.requiredNurses,
                requiredChargeNurses: dayData.shifts.evening.requiredChargeNurses,
                actualNurses: dayData.shifts.evening.assignedNurses.length,
                coverage: dayData.shifts.evening.coverage
              },
              NIGHT: {
                nurses: dayData.shifts.night.assignedNurses,
                requiredNurses: dayData.shifts.night.requiredNurses,
                requiredChargeNurses: dayData.shifts.night.requiredChargeNurses,
                actualNurses: dayData.shifts.night.assignedNurses.length,
                coverage: dayData.shifts.night.coverage
              }
            }
          };
        });
      }
      
      const response = await apiCall(`/schedules/${editedSchedule._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          scheduleData: scheduleDataMap,
          status: editedSchedule.status
        })
      });

      if (response.success) {
        setSuccess('Schedule updated successfully!');
        setHasChanges(false);
        
        // Update selectedSchedule to match editedSchedule
        setSelectedSchedule(JSON.parse(JSON.stringify(editedSchedule)));
        
        // Reload schedules
        loadSchedules();
        
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.message || 'Failed to save schedule');
      }
    } catch (error: any) {
      console.error('Failed to save schedule:', error);
      setError(error.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    if (selectedSchedule) {
      setEditedSchedule(JSON.parse(JSON.stringify(selectedSchedule)));
      setHasChanges(false);
      setSelectedNurse(null);
      setSuccess('Changes reset to original schedule');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const getShiftColor = (shift: string) => {
    switch (shift.toUpperCase()) {
      case 'DAY': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'EVENING': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'NIGHT': return 'bg-purple-100 border-purple-300 text-purple-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Invalid Date';
    
    // Handle different date formats
    const date = new Date(dateStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Edit3 className="h-6 w-6" />
          <span>Manual Schedule Editor</span>
        </h2>
        <p className="text-gray-600 mt-1">
          Load a generated schedule and manually adjust nurse assignments as needed
        </p>
      </div>

      {/* Ward & Schedule Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Load Schedule for Editing</CardTitle>
          <CardDescription>Select a ward and then choose a schedule to modify</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ward Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Ward
            </label>
            <select
              value={selectedWard}
              onChange={(e) => {
                setSelectedWard(e.target.value);
                setSelectedSchedule(null);
                setEditedSchedule(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a Ward --</option>
              {wards.map((ward) => (
                <option key={ward._id} value={ward._id}>
                  {ward.name}
                </option>
              ))}
            </select>
          </div>

          {/* Schedule Selection */}
          {selectedWard && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Schedules
              </label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : schedules.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No schedules found for this ward. Generate a schedule first.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule._id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        editedSchedule?._id === schedule._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                      onClick={() => loadScheduleForEdit(schedule)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1 text-sm text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span>Generated: {new Date(schedule.createdAt || '').toLocaleString()}</span>
                          </div>
                        </div>
                        <Badge variant={schedule.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {schedule.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
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

      {/* Schedule Editor */}
      {editedSchedule && (
        <>
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>How to edit:</strong>
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Click on a nurse to select them (highlighted in blue)</li>
                <li>Click on a target shift to move the selected nurse there</li>
                <li>Click the trash icon to remove a nurse from a shift</li>
                <li>Click "Save Changes" when done to update the schedule</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {selectedNurse && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <User className="h-3 w-3 mr-1" />
                  Selected: {selectedNurse.nurse.nurseName}
                </Badge>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={resetChanges}
                variant="outline"
                disabled={!hasChanges || saving}
                className="text-gray-700 dark:text-gray-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Changes
              </Button>
              <Button
                onClick={saveSchedule}
                disabled={!hasChanges || saving}
                className="bg-green-600 hover:bg-green-700 text-black dark:text-white disabled:bg-green-400 disabled:text-black dark:disabled:text-white disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black dark:border-white border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="space-y-4">
            {editedSchedule.scheduleData.map((dayData) => (
              <Card key={dayData.date}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {formatDate(dayData.date)} - {dayData.dayOfWeek}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Day Shift */}
                    {['DAY', 'EVENING', 'NIGHT'].map((shiftType) => {
                      const shiftKey = shiftType.toLowerCase() as 'day' | 'evening' | 'night';
                      const shiftData = dayData.shifts[shiftKey];
                      
                      return (
                        <div
                          key={shiftType}
                          className={`border-2 rounded-lg p-4 ${getShiftColor(shiftType)} ${
                            selectedNurse ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                          }`}
                          onClick={() => {
                            if (selectedNurse) {
                              moveNurseToShift(dayData.date, shiftType);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-sm">
                              {shiftType} SHIFT
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {shiftData.assignedNurses.length}/{shiftData.requiredNurses + shiftData.requiredChargeNurses}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            {shiftData.assignedNurses.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">No nurses assigned</p>
                            ) : (
                              shiftData.assignedNurses.map((nurse, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between p-2 rounded border ${
                                    selectedNurse?.nurse.nurseId === nurse.nurseId &&
                                    selectedNurse?.date === dayData.date &&
                                    selectedNurse?.shift === shiftType
                                      ? 'border-blue-500 bg-blue-100'
                                      : 'border-gray-200 bg-white hover:border-gray-300'
                                  } cursor-pointer transition-colors`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNurseClick(nurse, dayData.date, shiftType);
                                  }}
                                >
                                  <div className="flex items-center space-x-2">
                                    <User className="h-3 w-3" />
                                    <span className="text-sm font-medium">{nurse.nurseName}</span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeNurseFromShift(dayData.date, shiftType, nurse.nurseId);
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))
                            )}
                            
                            {/* Add Nurse Button */}
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                // If a nurse is selected, add them directly to this shift
                                if (selectedNurse) {
                                  moveNurseToShift(dayData.date, shiftType);
                                } else {
                                  // Otherwise, open modal to enter nurse ID
                                  openAddNurseModal(dayData.date, shiftType);
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full mt-2 text-xs"
                            >
                              <User className="h-3 w-3 mr-1" />
                              {selectedNurse ? `Add ${selectedNurse.nurse.nurseName}` : 'Add Nurse by ID'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add Nurse Modal */}
      <Dialog open={showAddNurseModal} onOpenChange={setShowAddNurseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Nurse to Shift</DialogTitle>
            <DialogDescription>
              Enter the Nurse ID to add them to the {addNurseData.shift} shift on {addNurseData.date}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nurseId">Nurse ID</Label>
              <Input
                id="nurseId"
                placeholder="e.g., nurse14"
                value={addNurseData.nurseId}
                onChange={(e) => setAddNurseData({ ...addNurseData, nurseId: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addNurseToShift();
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Enter the exact nurse ID (e.g., nurse14, nurse25)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddNurseModal(false);
                setAddNurseData({ date: '', shift: '', nurseId: '' });
              }}
            >
              Cancel
            </Button>
            <Button onClick={addNurseToShift}>
              <User className="h-4 w-4 mr-2" />
              Add Nurse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManualScheduleEditor;
