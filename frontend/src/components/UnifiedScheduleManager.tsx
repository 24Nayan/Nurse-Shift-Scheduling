import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Calendar, Loader2, Save, RefreshCw, Trash2, UserPlus, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';

interface Ward {
  _id: string;
  name: string;
  wardId: string;
}

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

interface Shift {
  nurses: Nurse[];
  required: number;
  assigned: number;
  coverage: number;
}

interface DaySchedule {
  date: string;
  day: string;
  shifts: {
    DAY: Shift;
    EVENING: Shift;
    NIGHT: Shift;
  };
}

interface Schedule {
  _id: string;
  wardName: string;
  startDate: string;
  endDate: string;
  scheduleData: DaySchedule[];
  status: string;
  qualityMetrics?: {
    overallScore: number;
    coverageScore: number;
    fairnessScore: number;
    constraintViolations: number;
  };
}

const UnifiedScheduleManager: React.FC = () => {
  const { apiCall } = useAuth() as any;
  
  // Generation State
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Schedule State
  const [generatedSchedule, setGeneratedSchedule] = useState<Schedule | null>(null);
  const [editedSchedule, setEditedSchedule] = useState<Schedule | null>(null);
  const [selectedNurse, setSelectedNurse] = useState<{ nurse: Nurse; date: string; shift: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // UI State
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showAddNurseModal, setShowAddNurseModal] = useState(false);
  const [addNurseData, setAddNurseData] = useState({ date: '', shift: '', nurseId: '' });

  useEffect(() => {
    loadWards();
    
    // Set default dates (current week)
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    setStartDate(monday.toISOString().split('T')[0]);
    setEndDate(sunday.toISOString().split('T')[0]);
  }, []);

  const loadWards = async () => {
    try {
      const data = await apiCall('/wards');
      if (data.success) {
        setWards(data.data);
      }
    } catch (error) {
      console.error('Failed to load wards:', error);
    }
  };

  const generateSchedule = async () => {
    if (!selectedWard || !startDate || !endDate) {
      setMessage({ type: 'error', text: 'Please select ward and date range' });
      return;
    }

    setIsGenerating(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await apiCall('/schedules/generate', {
        method: 'POST',
        body: JSON.stringify({
          wardId: selectedWard,
          startDate,
          endDate,
          useGeneticAlgorithm: false
        })
      });

      if (response.success) {
        // Transform the schedule data - backend returns array, we need to transform it
        const scheduleData = response.data.scheduleData;
        const transformedData: DaySchedule[] = [];

        // Backend returns an array, not an object with date keys
        if (Array.isArray(scheduleData)) {
          scheduleData.forEach((dayData: any) => {
            // Backend uses lowercase shift names and assignedNurses
            const dayShift = dayData.shifts?.day || {};
            const eveningShift = dayData.shifts?.evening || {};
            const nightShift = dayData.shifts?.night || {};
            
            transformedData.push({
              date: dayData.date,
              day: dayData.dayOfWeek || new Date(dayData.date).toLocaleDateString('en-US', { weekday: 'long' }),
              shifts: {
                DAY: {
                  nurses: dayShift.assignedNurses || [],
                  required: dayShift.requiredNurses || 0,
                  assigned: dayShift.actualNurses || (dayShift.assignedNurses || []).length,
                  coverage: dayShift.coverage || 0
                },
                EVENING: {
                  nurses: eveningShift.assignedNurses || [],
                  required: eveningShift.requiredNurses || 0,
                  assigned: eveningShift.actualNurses || (eveningShift.assignedNurses || []).length,
                  coverage: eveningShift.coverage || 0
                },
                NIGHT: {
                  nurses: nightShift.assignedNurses || [],
                  required: nightShift.requiredNurses || 0,
                  assigned: nightShift.actualNurses || (nightShift.assignedNurses || []).length,
                  coverage: nightShift.coverage || 0
                }
              }
            });
          });
        }

        // Already sorted by backend, but ensure it
        transformedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const transformedSchedule: Schedule = {
          ...response.data,
          scheduleData: transformedData
        };

        console.log('✅ Transformed schedule:', transformedSchedule);

        setGeneratedSchedule(transformedSchedule);
        setEditedSchedule(JSON.parse(JSON.stringify(transformedSchedule))); // Deep clone
        setHasChanges(false);
        setMessage({ 
          type: 'success', 
          text: `Schedule generated successfully! Quality Score: ${response.data.qualityMetrics?.overallScore?.toFixed(1) || 100}%` 
        });
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to generate schedule' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error generating schedule' });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSchedule = async () => {
    if (!editedSchedule) return;

    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Transform array back to Map/Object for backend
      const scheduleDataMap: any = {};
      
      editedSchedule.scheduleData.forEach((dayData: DaySchedule) => {
        scheduleDataMap[dayData.date] = {
          shifts: {
            DAY: {
              nurses: dayData.shifts.DAY.nurses,
              requiredNurses: dayData.shifts.DAY.required,
              actualNurses: dayData.shifts.DAY.assigned,
              coverage: dayData.shifts.DAY.coverage
            },
            EVENING: {
              nurses: dayData.shifts.EVENING.nurses,
              requiredNurses: dayData.shifts.EVENING.required,
              actualNurses: dayData.shifts.EVENING.assigned,
              coverage: dayData.shifts.EVENING.coverage
            },
            NIGHT: {
              nurses: dayData.shifts.NIGHT.nurses,
              requiredNurses: dayData.shifts.NIGHT.required,
              actualNurses: dayData.shifts.NIGHT.assigned,
              coverage: dayData.shifts.NIGHT.coverage
            }
          }
        };
      });

      const response = await apiCall(`/schedules/${editedSchedule._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          scheduleData: scheduleDataMap,
          status: editedSchedule.status
        })
      });

      if (response.success) {
        setGeneratedSchedule(JSON.parse(JSON.stringify(editedSchedule)));
        setHasChanges(false);
        setMessage({ type: 'success', text: 'Schedule saved successfully!' });
        
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to save schedule' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error saving schedule' });
    } finally {
      setIsSaving(false);
    }
  };

  const resetChanges = () => {
    if (generatedSchedule) {
      setEditedSchedule(JSON.parse(JSON.stringify(generatedSchedule)));
      setHasChanges(false);
      setSelectedNurse(null);
      setMessage({ type: 'success', text: 'Changes reset to original schedule' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleNurseClick = (nurse: Nurse, date: string, shift: string) => {
    if (selectedNurse && 
        selectedNurse.nurse.nurseId === nurse.nurseId && 
        selectedNurse.date === date && 
        selectedNurse.shift === shift) {
      setSelectedNurse(null);
    } else {
      setSelectedNurse({ nurse, date, shift });
    }
  };

  const moveNurseToShift = (targetDate: string, targetShift: string) => {
    if (!selectedNurse || !editedSchedule) return;

    const newSchedule = JSON.parse(JSON.stringify(editedSchedule));
    
    // Find source and target days
    const sourceDayIndex = newSchedule.scheduleData.findIndex((d: DaySchedule) => d.date === selectedNurse.date);
    const targetDayIndex = newSchedule.scheduleData.findIndex((d: DaySchedule) => d.date === targetDate);
    
    if (sourceDayIndex === -1 || targetDayIndex === -1) return;

    const sourceShiftKey = selectedNurse.shift as 'DAY' | 'EVENING' | 'NIGHT';
    const targetShiftKey = targetShift as 'DAY' | 'EVENING' | 'NIGHT';
    
    // Check if nurse is already in target shift
    const targetNurses = newSchedule.scheduleData[targetDayIndex].shifts[targetShiftKey].nurses;
    if (targetNurses.some((n: Nurse) => n.nurseId === selectedNurse.nurse.nurseId)) {
      setMessage({ type: 'error', text: 'Nurse is already assigned to this shift' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    // Remove from source
    const sourceNurses = newSchedule.scheduleData[sourceDayIndex].shifts[sourceShiftKey].nurses;
    const nurseIndex = sourceNurses.findIndex((n: Nurse) => n.nurseId === selectedNurse.nurse.nurseId);
    
    if (nurseIndex !== -1) {
      const [removedNurse] = sourceNurses.splice(nurseIndex, 1);
      
      // Update source shift stats
      newSchedule.scheduleData[sourceDayIndex].shifts[sourceShiftKey].assigned = sourceNurses.length;
      newSchedule.scheduleData[sourceDayIndex].shifts[sourceShiftKey].coverage = 
        (sourceNurses.length / newSchedule.scheduleData[sourceDayIndex].shifts[sourceShiftKey].required) * 100;
      
      // Add to target
      targetNurses.push(removedNurse);
      
      // Update target shift stats
      newSchedule.scheduleData[targetDayIndex].shifts[targetShiftKey].assigned = targetNurses.length;
      newSchedule.scheduleData[targetDayIndex].shifts[targetShiftKey].coverage = 
        (targetNurses.length / newSchedule.scheduleData[targetDayIndex].shifts[targetShiftKey].required) * 100;
      
      setEditedSchedule(newSchedule);
      setHasChanges(true);
      setSelectedNurse(null);
      setMessage({ type: 'success', text: `Moved ${removedNurse.nurseName} to ${targetDate} ${targetShift} shift` });
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const removeNurseFromShift = (date: string, shift: string, nurseId: string) => {
    if (!editedSchedule) return;

    const newSchedule = JSON.parse(JSON.stringify(editedSchedule));
    const dayIndex = newSchedule.scheduleData.findIndex((d: DaySchedule) => d.date === date);
    
    if (dayIndex === -1) return;

    const shiftKey = shift as 'DAY' | 'EVENING' | 'NIGHT';
    const nurses = newSchedule.scheduleData[dayIndex].shifts[shiftKey].nurses;
    const nurseIndex = nurses.findIndex((n: Nurse) => n.nurseId === nurseId);
    
    if (nurseIndex !== -1) {
      const [removedNurse] = nurses.splice(nurseIndex, 1);
      
      // Update shift stats
      newSchedule.scheduleData[dayIndex].shifts[shiftKey].assigned = nurses.length;
      newSchedule.scheduleData[dayIndex].shifts[shiftKey].coverage = 
        (nurses.length / newSchedule.scheduleData[dayIndex].shifts[shiftKey].required) * 100;
      
      setEditedSchedule(newSchedule);
      setHasChanges(true);
      setMessage({ type: 'success', text: `Removed ${removedNurse.nurseName} from ${date} ${shift} shift` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const openAddNurseModal = (date: string, shift: string) => {
    if (selectedNurse) {
      // If a nurse is selected, add them directly
      moveNurseToShift(date, shift);
    } else {
      // Otherwise, open modal to enter nurse ID
      setAddNurseData({ date, shift, nurseId: '' });
      setShowAddNurseModal(true);
    }
  };

  const addNurseToShift = async () => {
    if (!addNurseData.nurseId.trim() || !editedSchedule) {
      setMessage({ type: 'error', text: 'Please enter a nurse ID' });
      return;
    }

    try {
      // Fetch nurse details
      const response = await apiCall(`/nurses?nurseId=${addNurseData.nurseId}`);
      
      if (!response.success || !response.data || response.data.length === 0) {
        setMessage({ type: 'error', text: 'Nurse not found' });
        return;
      }

      const nurse = response.data[0];
      const newSchedule = JSON.parse(JSON.stringify(editedSchedule));
      const dayIndex = newSchedule.scheduleData.findIndex((d: DaySchedule) => d.date === addNurseData.date);
      
      if (dayIndex === -1) return;

      const shiftKey = addNurseData.shift as 'DAY' | 'EVENING' | 'NIGHT';
      const shift = newSchedule.scheduleData[dayIndex].shifts[shiftKey];
      
      // Check if already assigned
      if (shift.nurses.some((n: Nurse) => n.nurseId === nurse._id)) {
        setMessage({ type: 'error', text: 'Nurse already assigned to this shift' });
        return;
      }

      // Add nurse
      shift.nurses.push({
        nurseId: nurse._id,
        nurseName: nurse.nurseId,
        role: nurse.hierarchyLevel >= 2 ? 'Charge Nurse' : 'Staff Nurse',
        hours: 8
      });
      
      shift.assigned = shift.nurses.length;
      shift.coverage = (shift.assigned / shift.required) * 100;

      setEditedSchedule(newSchedule);
      setHasChanges(true);
      setShowAddNurseModal(false);
      setAddNurseData({ date: '', shift: '', nurseId: '' });
      setMessage({ type: 'success', text: `Added ${nurse.nurseId} to shift` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error adding nurse' });
    }
  };

  const getShiftColor = (shiftType: string) => {
    switch (shiftType) {
      case 'DAY': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
      case 'EVENING': return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
      case 'NIGHT': return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700';
      default: return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 100) return 'text-green-600 dark:text-green-400';
    if (coverage >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Schedule Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Generate & Edit Schedule
          </CardTitle>
          <CardDescription>
            Generate a new schedule and make adjustments before saving
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ward">Ward</Label>
              <Select value={selectedWard} onValueChange={setSelectedWard}>
                <SelectTrigger id="ward">
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map(ward => (
                    <SelectItem key={ward._id} value={ward._id}>
                      {ward.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={generateSchedule} 
              disabled={isGenerating || !selectedWard}
              className="bg-blue-600 hover:bg-blue-700 text-black dark:text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Generate Schedule
                </>
              )}
            </Button>

            {editedSchedule && (
              <>
                <Button 
                  onClick={resetChanges}
                  variant="outline"
                  disabled={!hasChanges}
                  className="text-gray-700 dark:text-gray-200"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Changes
                </Button>

                <Button 
                  onClick={saveSchedule}
                  disabled={!hasChanges || isSaving}
                  className="bg-green-600 hover:bg-green-700 text-black dark:text-white disabled:bg-green-400 disabled:text-black dark:disabled:text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Schedule
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {message.text && (
            <Alert className={message.type === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-green-500 bg-green-50 dark:bg-green-900/20'}>
              <AlertCircle className={`h-4 w-4 ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`} />
              <AlertDescription className={message.type === 'error' ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {editedSchedule?.qualityMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overall Score</p>
                <p className="text-2xl font-bold">{editedSchedule.qualityMetrics.overallScore.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Coverage</p>
                <p className="text-2xl font-bold">{editedSchedule.qualityMetrics.coverageScore.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Fairness</p>
                <p className="text-2xl font-bold">{editedSchedule.qualityMetrics.fairnessScore.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Violations</p>
                <p className={`text-2xl font-bold ${editedSchedule.qualityMetrics.constraintViolations > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {editedSchedule.qualityMetrics.constraintViolations}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Editor Section */}
      {editedSchedule && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Editor</CardTitle>
            <CardDescription>
              Click a nurse to select, then click a shift to move them. Click "Add Nurse" to add staff to a shift.
              {selectedNurse && (
                <Badge className="ml-2 bg-blue-600 text-white">
                  Selected: {selectedNurse.nurse.nurseName}
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {editedSchedule.scheduleData.map((daySchedule) => (
                <Card key={daySchedule.date} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 dark:bg-gray-800 pb-3">
                    <CardTitle className="text-lg">
                      {daySchedule.day} - {new Date(daySchedule.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(['DAY', 'EVENING', 'NIGHT'] as const).map((shiftType) => {
                        const shift = daySchedule.shifts[shiftType];
                        return (
                          <div 
                            key={shiftType} 
                            className={`p-4 rounded-lg border-2 ${getShiftColor(shiftType)} ${
                              selectedNurse ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                            }`}
                            onClick={() => selectedNurse && moveNurseToShift(daySchedule.date, shiftType)}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-semibold">{shiftType} SHIFT</h4>
                              <Badge variant="outline" className={getCoverageColor(shift.coverage)}>
                                {shift.assigned}/{shift.required}
                              </Badge>
                            </div>

                            <div className="space-y-2 mb-3">
                              {shift.nurses.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">No nurses assigned</p>
                              ) : (
                                shift.nurses.map((nurse, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex items-center justify-between p-2 rounded border ${
                                      selectedNurse?.nurse.nurseId === nurse.nurseId &&
                                      selectedNurse?.date === daySchedule.date &&
                                      selectedNurse?.shift === shiftType
                                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-900'
                                        : 'border-gray-200 bg-white dark:bg-gray-700 hover:border-gray-300'
                                    } cursor-pointer transition-colors`}
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      handleNurseClick(nurse, daySchedule.date, shiftType);
                                    }}
                                  >
                                    <span className="text-sm font-medium">{nurse.nurseName}</span>
                                    <button
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        removeNurseFromShift(daySchedule.date, shiftType, nurse.nurseId);
                                      }}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>

                            <Button
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                openAddNurseModal(daySchedule.date, shiftType);
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              {selectedNurse ? `Add ${selectedNurse.nurse.nurseName}` : 'Add Nurse by ID'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddNurseData({ ...addNurseData, nurseId: e.target.value })}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    addNurseToShift();
                  }
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
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
            <Button onClick={addNurseToShift} className="bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Nurse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedScheduleManager;
