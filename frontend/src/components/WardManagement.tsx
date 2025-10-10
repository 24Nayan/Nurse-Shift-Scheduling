import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Plus, Users, AlertCircle, Edit, Trash2, ChevronDown, ChevronUp, Clock, UserCheck, Bed } from 'lucide-react';
import { apiService, Ward } from '../utils/api';

// Constants for form options
const QUALIFICATIONS = [
  'RN', 'BSN', 'MSN', 'ACLS', 'BLS', 'CCRN', 'CEN', 'PALS', 'NREMT', 'CNS', 'NP'
];

const PATIENT_TYPES = [
  'trauma', 'emergency', 'critical', 'general', 'pediatric', 'geriatric', 
  'surgical', 'cardiac', 'orthopedic', 'neurology', 'oncology'
];

export default function WardManagement() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [expandedWards, setExpandedWards] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    description: '',
    capacity: 0,
    currentOccupancy: 0,
    location: '',
    dailyStaff: {
      nurses: 0,
      doctors: 0,
      support: 0
    },
    qualifications: [] as string[],
    patientTypes: [] as string[],
    shiftRequirements: {
      day: { nurses: 0, doctors: 0, support: 0 },
      evening: { nurses: 0, doctors: 0, support: 0 },
      night: { nurses: 0, doctors: 0, support: 0 }
    },
    specialEquipment: [] as string[],
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Fetch wards from API
  const fetchWards = async () => {
    try {
      setLoading(true);
      const response = await apiService.getWards({ isActive: true });
      setWards(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching wards:', error);
      setWards([]);
    } finally {
       
      setLoading(false);
    }
  };

  // Load wards on component mount
  useEffect(() => {
    fetchWards();
  }, []);

  const handleAddWard = () => {
    console.log('Add Ward button clicked');
    setError(null); // Clear any previous errors
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      console.log('Submitting ward:', formData);
      await apiService.createWard(formData);
      console.log('Ward created successfully!');
      setError(null); // Clear any errors
      setIsAddDialogOpen(false);
      // Refresh the ward list
      await fetchWards();
      // Reset form
      setFormData({
        name: '',
        department: '',
        description: '',
        capacity: 0,
        currentOccupancy: 0,
        location: '',
        dailyStaff: { nurses: 0, doctors: 0, support: 0 },
        qualifications: [],
        patientTypes: [],
        shiftRequirements: {
          day: { nurses: 0, doctors: 0, support: 0 },
          evening: { nurses: 0, doctors: 0, support: 0 },
          night: { nurses: 0, doctors: 0, support: 0 }
        },
        specialEquipment: [],
        notes: ''
      });
    } catch (error) {
      console.error('Error creating ward:', error);
      if (error instanceof Error) {
        if (error.message.includes('Ward name already exists')) {
          setError(`A ward with the name "${formData.name}" already exists. Please choose a different name.`);
        } else if (error.message.includes('validation failed')) {
          setError('Please check all required fields and try again.');
        } else {
          setError(`Failed to create ward: ${error.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    // Clear error when user changes the name field (for duplicate name errors)
    if (field === 'name' && error && error.includes('already exists')) {
      setError(null);
    }
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // If capacity is being changed and currentOccupancy exceeds new capacity, adjust it
      if (field === 'capacity' && typeof value === 'number') {
        if (prev.currentOccupancy > value) {
          newData.currentOccupancy = value;
        }
      }
      
      return newData;
    });
  };

  const handleNestedInputChange = (section: string, field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof typeof prev] as any),
        [field]: value
      }
    }));
  };

  const handleShiftRequirementChange = (shift: 'day' | 'evening' | 'night', field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      shiftRequirements: {
        ...prev.shiftRequirements,
        [shift]: {
          ...prev.shiftRequirements[shift],
          [field]: value
        }
      }
    }));
  };

  const handleArrayToggle = (field: 'qualifications' | 'patientTypes', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const toggleWardExpansion = (wardId: string) => {
    setExpandedWards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wardId)) {
        newSet.delete(wardId);
      } else {
        newSet.add(wardId);
      }
      return newSet;
    });
  };

  const handleEditWard = (ward: Ward) => {
    setEditingWard(ward);
    setFormData({
      name: ward.name,
      department: ward.department,
      description: ward.description || '',
      capacity: ward.capacity,
      currentOccupancy: ward.currentOccupancy || 0,
      location: ward.location || '',
      dailyStaff: ward.dailyStaff || { nurses: 0, doctors: 0, support: 0 },
      qualifications: ward.qualifications || [],
      patientTypes: ward.patientTypes || [],
      shiftRequirements: ward.shiftRequirements || {
        day: { nurses: 0, doctors: 0, support: 0 },
        evening: { nurses: 0, doctors: 0, support: 0 },
        night: { nurses: 0, doctors: 0, support: 0 }
      },
      specialEquipment: ward.specialEquipment || [],
      notes: ward.notes || ''
    });
    setError(null);
    setIsEditDialogOpen(true);
  };

  const handleUpdateWard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWard) return;
    
    // Validate current occupancy before sending
    if (formData.currentOccupancy > formData.capacity) {
      setError(`Current occupancy (${formData.currentOccupancy}) cannot exceed capacity (${formData.capacity}). Please adjust the values.`);
      setSaving(false);
      return;
    }
    
    setSaving(true);
    try {
      // Create a clean update object, excluding any problematic fields
      const updateData: any = { ...formData };
      
      // If currentOccupancy is 0 or not set, don't send it to avoid validation issues
      if (!updateData.currentOccupancy || updateData.currentOccupancy === 0) {
        delete updateData.currentOccupancy;
      }
      
      console.log('Updating ward with data:', updateData);
      await apiService.updateWard(editingWard._id, updateData);
      setError(null);
      setIsEditDialogOpen(false);
      setEditingWard(null);
      await fetchWards();
      // Reset form
      setFormData({
        name: '',
        department: '',
        description: '',
        capacity: 0,
        currentOccupancy: 0,
        location: '',
        dailyStaff: { nurses: 0, doctors: 0, support: 0 },
        qualifications: [],
        patientTypes: [],
        shiftRequirements: {
          day: { nurses: 0, doctors: 0, support: 0 },
          evening: { nurses: 0, doctors: 0, support: 0 },
          night: { nurses: 0, doctors: 0, support: 0 }
        },
        specialEquipment: [],
        notes: ''
      });
    } catch (error) {
      console.error('Error updating ward:', error);
      if (error instanceof Error) {
        if (error.message.includes('Ward name already exists')) {
          setError(`A ward with the name "${formData.name}" already exists. Please choose a different name.`);
        } else if (error.message.includes('validation failed')) {
          setError('Please check all required fields and try again.');
        } else {
          setError(`Failed to update ward: ${error.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWard = async (wardId: string, wardName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${wardName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      console.log('Deleting ward:', wardId, wardName);
      await apiService.deleteWard(wardId);
      console.log('Ward deleted successfully');
      await fetchWards();
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error deleting ward:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete ward';
      setError(`Failed to delete "${wardName}": ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Ward Management</CardTitle>
              <p className="text-gray-600 mt-1">Manage hospital wards and their requirements</p>
            </div>
            <Button onClick={handleAddWard} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Ward
            </Button>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Loading wards...</p>
          </CardContent>
        </Card>
      ) : wards.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No wards found</p>
            <Button onClick={handleAddWard}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Ward
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {wards.map((ward) => {
            const isExpanded = expandedWards.has(ward._id);
            return (
              <Card key={ward._id} className="hover:shadow-lg transition-all duration-200 border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bed className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg font-semibold text-gray-900">{ward.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleEditWard(ward);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Edit Ward
                      </Button>
                      <button
                        onClick={() => toggleWardExpansion(ward._id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        aria-label={isExpanded ? "Collapse ward details" : "Expand ward details"}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{ward.department}</p>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Main Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-500">Capacity</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{ward.capacity}</div>
                      <div className="text-xs text-gray-500">Patient beds</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <UserCheck className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-500">Daily Staff</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{(ward.dailyStaff?.nurses || 0) + (ward.dailyStaff?.doctors || 0) + (ward.dailyStaff?.support || 0)}</div>
                      <div className="text-xs text-gray-500">Nurses per day</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-500">Qualifications</span>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1 mt-1">
                        {ward.qualifications && ward.qualifications.length > 0 ? (
                          <>
                            {ward.qualifications.slice(0, 3).map((qual) => (
                              <Badge key={qual} variant="secondary" className="text-xs">{qual}</Badge>
                            ))}
                            {ward.qualifications.length > 3 && (
                              <Badge variant="secondary" className="text-xs">+{ward.qualifications.length - 3}</Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">None specified</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Patient Types */}
                  <div className="mb-4">
                    <div className="flex items-center gap-1 mb-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Patient Types</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ward.patientTypes && ward.patientTypes.length > 0 ? (
                        ward.patientTypes.map((type) => (
                          <Badge key={type} variant="outline" className="text-xs capitalize">{type}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No specific types</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t pt-4 space-y-4">
                      {/* Location */}
                      {ward.location && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Location: </span>
                          <span className="text-sm text-gray-600">{ward.location}</span>
                        </div>
                      )}

                      {/* Description */}
                      {ward.description && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Description: </span>
                          <span className="text-sm text-gray-600">{ward.description}</span>
                        </div>
                      )}

                      {/* Detailed Staff Requirements */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Shift Requirements</h4>
                        <div className="space-y-2">
                          {(['day', 'evening', 'night'] as const).map((shift) => {
                            const shiftData = ward.shiftRequirements?.[shift];
                            if (!shiftData) return null;
                            
                            return (
                              <div key={shift} className="bg-gray-50 p-3 rounded">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-medium capitalize">{shift} Shift</span>
                                  <span className="text-xs text-gray-500">
                                    Total: {(shiftData.nurses || 0) + (shiftData.doctors || 0) + (shiftData.support || 0)}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <span className="text-gray-500">Staff Nurses: </span>
                                    <span className="font-medium">{shiftData.nurses || 0}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Charge Nurse: </span>
                                    <span className="font-medium">{shiftData.doctors || 0}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Support: </span>
                                    <span className="font-medium">{shiftData.support || 0}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Special Equipment */}
                      {ward.specialEquipment && ward.specialEquipment.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Special Equipment: </span>
                          <span className="text-sm text-gray-600">{ward.specialEquipment.join(', ')}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {ward.notes && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Notes: </span>
                          <span className="text-sm text-gray-600">{ward.notes}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleEditWard(ward);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="flex-1"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleDeleteWard(ward._id, ward.name);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Ward Modal */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Add New Ward</h2>
              <button
                onClick={() => {
                  setError(null);
                  setIsAddDialogOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {error && (
                <Alert className="mb-6 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Ward Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department *</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description of the ward"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="capacity">Capacity *</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentOccupancy">Current Occupancy</Label>
                    <Input
                      id="currentOccupancy"
                      type="number"
                      min="0"
                      max={formData.capacity}
                      value={formData.currentOccupancy}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        const clampedValue = Math.min(Math.max(value, 0), formData.capacity);
                        handleInputChange('currentOccupancy', clampedValue);
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Current number of patients (max: {formData.capacity})</p>
                    {formData.currentOccupancy > formData.capacity && (
                      <p className="text-xs text-red-500 mt-1">Current occupancy cannot exceed capacity!</p>
                    )}
                  </div>
                </div>

                {/* Daily Staff Requirements */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Daily Staff</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dailyNurses">Nurses per day</Label>
                      <Input
                        id="dailyNurses"
                        type="number"
                        min="0"
                        value={formData.dailyStaff.nurses}
                        onChange={(e) => handleNestedInputChange('dailyStaff', 'nurses', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dailyDoctors">Doctors per day</Label>
                      <Input
                        id="dailyDoctors"
                        type="number"
                        min="0"
                        value={formData.dailyStaff.doctors}
                        onChange={(e) => handleNestedInputChange('dailyStaff', 'doctors', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dailySupport">Support Staff per day</Label>
                      <Input
                        id="dailySupport"
                        type="number"
                        min="0"
                        value={formData.dailyStaff.support}
                        onChange={(e) => handleNestedInputChange('dailyStaff', 'support', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Qualifications */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Qualifications</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {QUALIFICATIONS.map((qual) => (
                      <label key={qual} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.qualifications.includes(qual)}
                          onChange={() => handleArrayToggle('qualifications', qual)}
                          className="rounded"
                        />
                        <span className="text-sm">{qual}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.qualifications.map((qual) => (
                      <Badge key={qual} variant="secondary" className="text-xs">
                        {qual}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Patient Types */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Patient Types</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {PATIENT_TYPES.map((type) => (
                      <label key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.patientTypes.includes(type)}
                          onChange={() => handleArrayToggle('patientTypes', type)}
                          className="rounded"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.patientTypes.map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Shift Requirements */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Shift Requirements</h3>
                  {(['day', 'evening', 'night'] as const).map((shift) => (
                    <div key={shift} className="mb-4">
                      <h4 className="text-md font-medium mb-2 capitalize">{shift} Shift</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`${shift}-staff-nurses`}>Staff Nurses</Label>
                          <Input
                            id={`${shift}-staff-nurses`}
                            type="number"
                            min="0"
                            value={formData.shiftRequirements[shift].nurses}
                            onChange={(e) => handleShiftRequirementChange(shift, 'nurses', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${shift}-charge-nurse`}>Charge Nurse</Label>
                          <Input
                            id={`${shift}-charge-nurse`}
                            type="number"
                            min="0"
                            value={formData.shiftRequirements[shift].doctors}
                            onChange={(e) => handleShiftRequirementChange(shift, 'doctors', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${shift}-total`}>Total: {formData.shiftRequirements[shift].nurses + formData.shiftRequirements[shift].doctors}</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes about the ward..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Creating...' : 'Create Ward'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ward Modal */}
      {isEditDialogOpen && editingWard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Edit Ward: {editingWard.name}</h2>
              <button
                onClick={() => {
                  setError(null);
                  setIsEditDialogOpen(false);
                  setEditingWard(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {error && (
                <Alert className="mb-6 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleUpdateWard} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Ward Name *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-department">Department *</Label>
                    <Input
                      id="edit-department"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Input
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description of the ward"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-capacity">Capacity *</Label>
                    <Input
                      id="edit-capacity"
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-currentOccupancy">Current Occupancy</Label>
                    <Input
                      id="edit-currentOccupancy"
                      type="number"
                      min="0"
                      max={formData.capacity}
                      value={formData.currentOccupancy}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        const clampedValue = Math.min(Math.max(value, 0), formData.capacity);
                        handleInputChange('currentOccupancy', clampedValue);
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Current number of patients (max: {formData.capacity})</p>
                    {formData.currentOccupancy > formData.capacity && (
                      <p className="text-xs text-red-500 mt-1">Current occupancy cannot exceed capacity!</p>
                    )}
                  </div>
                </div>

                {/* Daily Staff Requirements */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Daily Staff</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-dailyNurses">Nurses per day</Label>
                      <Input
                        id="edit-dailyNurses"
                        type="number"
                        min="0"
                        value={formData.dailyStaff.nurses}
                        onChange={(e) => handleNestedInputChange('dailyStaff', 'nurses', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-dailyDoctors">Doctors per day</Label>
                      <Input
                        id="edit-dailyDoctors"
                        type="number"
                        min="0"
                        value={formData.dailyStaff.doctors}
                        onChange={(e) => handleNestedInputChange('dailyStaff', 'doctors', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-dailySupport">Support Staff per day</Label>
                      <Input
                        id="edit-dailySupport"
                        type="number"
                        min="0"
                        value={formData.dailyStaff.support}
                        onChange={(e) => handleNestedInputChange('dailyStaff', 'support', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Qualifications */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Qualifications</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {QUALIFICATIONS.map((qual) => (
                      <label key={qual} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.qualifications.includes(qual)}
                          onChange={() => handleArrayToggle('qualifications', qual)}
                          className="rounded"
                        />
                        <span className="text-sm">{qual}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.qualifications.map((qual) => (
                      <Badge key={qual} variant="secondary" className="text-xs">
                        {qual}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Patient Types */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Patient Types</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {PATIENT_TYPES.map((type) => (
                      <label key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.patientTypes.includes(type)}
                          onChange={() => handleArrayToggle('patientTypes', type)}
                          className="rounded"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.patientTypes.map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Shift Requirements */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Shift Requirements</h3>
                  {(['day', 'evening', 'night'] as const).map((shift) => (
                    <div key={shift} className="mb-4">
                      <h4 className="text-md font-medium mb-2 capitalize">{shift} Shift</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`edit-${shift}-staff-nurses`}>Staff Nurses</Label>
                          <Input
                            id={`edit-${shift}-staff-nurses`}
                            type="number"
                            min="0"
                            value={formData.shiftRequirements[shift].nurses}
                            onChange={(e) => handleShiftRequirementChange(shift, 'nurses', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-${shift}-charge-nurse`}>Charge Nurse</Label>
                          <Input
                            id={`edit-${shift}-charge-nurse`}
                            type="number"
                            min="0"
                            value={formData.shiftRequirements[shift].doctors}
                            onChange={(e) => handleShiftRequirementChange(shift, 'doctors', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-${shift}-total`}>Total: {formData.shiftRequirements[shift].nurses + formData.shiftRequirements[shift].doctors}</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <textarea
                    id="edit-notes"
                    className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes about the ward..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setIsEditDialogOpen(false);
                      setEditingWard(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Updating...' : 'Update Ward'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
