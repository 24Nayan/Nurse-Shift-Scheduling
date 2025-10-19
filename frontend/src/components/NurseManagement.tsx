import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent } from './ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from './ui/alert-dialog';
import { Users, UserPlus, Edit, Shield, Award, Trash2 } from 'lucide-react';
import { apiService, type Nurse } from '../utils/api';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'charge_nurse' | 'staff_nurse';
  name: string;
  access_token: string;
}

interface NurseManagementProps {
  user: User;
}

export function NurseManagement({ user: _user }: NurseManagementProps) {
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: '',
    nurseId: '',
    qualifications: '',
    wardAccess: '',
    hierarchyLevel: 1,
    yearsOfExperience: 0
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showSimpleModal, setShowSimpleModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nurseToDelete, setNurseToDelete] = useState<Nurse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Debug dialog state
  console.log('🔍 Dialog states - Add:', isAddDialogOpen, 'Edit:', isEditDialogOpen, 'Simple:', showSimpleModal, 'Delete:', deleteConfirmOpen);

  // Monitor state changes
  useEffect(() => {
    console.log('🔄 isAddDialogOpen changed to:', isAddDialogOpen);
  }, [isAddDialogOpen]);

  // Stable button handler
  const handleOpenAddNurseDialog = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🚀 Opening Add Nurse dialog');
    
    // Reset form with new generated ID
    const newNurseId = generateNurseId();
    setAddFormData({
      name: '',
      email: '',
      role: 'staff_nurse',
      nurseId: newNurseId,
      qualifications: '',
      wardAccess: '',
      hierarchyLevel: 1,
      yearsOfExperience: 0
    });
    
    setIsAddDialogOpen(true);
  }, []);
  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    role: 'staff_nurse',
    nurseId: '',
    qualifications: '',
    wardAccess: '',
    hierarchyLevel: 1,
    yearsOfExperience: 0
  });

  useEffect(() => {
    loadNurses();
  }, []);

  const loadNurses = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Try to load from MongoDB API
      const response = await apiService.getNurses();
      
      if (response.success && response.data) {
        setNurses(response.data as Nurse[]);
        console.log('Successfully loaded nurses from API:', (response.data as Nurse[]).length);
      } else {
        throw new Error(response.message || 'Failed to load nurses');
      }
    } catch (error) {
      console.error('Nurses loading error:', error);
      setError(`API Error: ${error instanceof Error ? error.message : 'Unknown error'}. Using demo data instead.`);
      
      // Fallback demo data for any errors
      const fallbackNurses = [
        {
          id: 'demo-1',
          email: 'alice.smith@hospital.com',
          name: 'Alice Smith',
          role: 'charge_nurse',
          nurseId: 'N001',
          qualifications: ['RN', 'BSN', 'CCRN'],
          wardAccess: ['ICU', 'Emergency'],
          hierarchyLevel: 2,
          yearsOfExperience: 8,
          availability: {},
          createdAt: new Date().toISOString()
        },
        {
          id: 'demo-2',
          email: 'bob.johnson@hospital.com',
          name: 'Bob Johnson',
          role: 'staff_nurse',
          nurseId: 'N002',
          qualifications: ['RN', 'BSN'],
          wardAccess: ['General', 'Surgery'],
          hierarchyLevel: 1,
          yearsOfExperience: 3,
          availability: {},
          createdAt: new Date().toISOString()
        },
        {
          id: 'demo-3',
          email: 'carol.williams@hospital.com',
          name: 'Carol Williams',
          role: 'admin',
          nurseId: 'N003',
          qualifications: ['RN', 'MSN', 'MBA'],
          wardAccess: ['all'],
          hierarchyLevel: 3,
          yearsOfExperience: 15,
          availability: {},
          createdAt: new Date().toISOString()
        }
      ];
      setNurses(fallbackNurses);
    } finally {
      setLoading(false);
    }
  };

  const generateNurseId = () => {
    return `N${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  };

  const handleOpenAddDialog = () => {
    console.log('🔄 Add Nurse button clicked!');
    
    // Reset form and generate new ID
    const newNurseId = generateNurseId();
    setAddFormData({
      name: '',
      email: '',
      role: 'staff_nurse',
      nurseId: newNurseId,
      qualifications: '',
      wardAccess: '',
      hierarchyLevel: 1,
      yearsOfExperience: 0
    });
    
    console.log('✅ Form data reset with ID:', newNurseId);
    setIsAddDialogOpen(true);
  };


  const handleEditNurse = (nurse: Nurse) => {
    setEditingNurse(nurse);
    setEditFormData({
      name: nurse.name,
      email: nurse.email,
      role: nurse.role,
      nurseId: nurse.nurseId,
      qualifications: nurse.qualifications.join(', '),
      wardAccess: nurse.wardAccess.join(', '),
      hierarchyLevel: nurse.hierarchyLevel,
      yearsOfExperience: nurse.yearsOfExperience
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteNurse = (nurse: Nurse) => {
    console.log('🗑️ Delete button clicked for nurse:', nurse.name);
    setNurseToDelete(nurse);
    setDeleteConfirmOpen(true);
    console.log('🗑️ Delete dialog should be open now');
  };

  const confirmDeleteNurse = async () => {
    if (!nurseToDelete) return;

    try {
      setDeleteLoading(true);
      setError('');

      const response = await apiService.deleteNurse(nurseToDelete.id);
      
      if (response.success) {
        // Remove nurse from local state
        setNurses(prev => prev.filter(n => n.id !== nurseToDelete.id));
        setDeleteConfirmOpen(false);
        setNurseToDelete(null);
        console.log('Nurse deleted successfully:', nurseToDelete.name);
      } else {
        throw new Error(response.message || 'Failed to delete nurse');
      }
    } catch (error) {
      console.error('Delete nurse error:', error);
      setError(`Failed to delete nurse: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDeleteNurse = () => {
    setDeleteConfirmOpen(false);
    setNurseToDelete(null);
  };



  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'charge_nurse': return 'bg-blue-100 text-blue-800';
      case 'staff_nurse': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHierarchyIcon = (level: number) => {
    if (level >= 3) return <Shield className="h-4 w-4 text-red-500" />;
    if (level >= 2) return <Award className="h-4 w-4 text-blue-500" />;
    return <Users className="h-4 w-4 text-green-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Nurse Management</CardTitle>
              <CardDescription>Manage hospital nursing staff and their qualifications</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                type="button"
                onClick={handleOpenAddNurseDialog}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Nurse
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log('🧪 Opening simple modal test');
                  setShowSimpleModal(true);
                }}
              >
                Test Modal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {nurses.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No nurses found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding a new nurse to the system.
              </p>
              <Button className="mt-4" onClick={handleOpenAddDialog}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add First Nurse
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nurse</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Qualifications</TableHead>
                    <TableHead>Ward Access</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nurses.map((nurse, index) => (
                    <TableRow key={`${nurse.id}-${index}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{nurse.name}</p>
                          <p className="text-sm text-gray-500">{nurse.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${getRoleBadgeColor(nurse.role)}`}
                          variant="secondary"
                        >
                          {nurse.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {nurse.nurseId}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {nurse.qualifications.slice(0, 3).map((qual, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {qual}
                            </Badge>
                          ))}
                          {nurse.qualifications.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{nurse.qualifications.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {nurse.wardAccess.includes('all') ? (
                            <Badge variant="default" className="text-xs">
                              All Wards
                            </Badge>
                          ) : (
                            nurse.wardAccess.slice(0, 2).map((ward, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {ward}
                              </Badge>
                            ))
                          )}
                          {nurse.wardAccess.length > 2 && !nurse.wardAccess.includes('all') && (
                            <Badge variant="outline" className="text-xs">
                              +{nurse.wardAccess.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {nurse.yearsOfExperience} {nurse.yearsOfExperience === 1 ? 'year' : 'years'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getHierarchyIcon(nurse.hierarchyLevel)}
                          <span className="text-sm font-medium">{nurse.hierarchyLevel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditNurse(nurse)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteNurse(nurse)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {nurses.length} nurse{nurses.length !== 1 ? 's' : ''}
            </p>
            <Button variant="outline" onClick={loadNurses}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Staff Nurses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nurses.filter(n => n.role === 'staff_nurse').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Front-line care providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Charge Nurses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nurses.filter(n => n.role === 'charge_nurse').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ward supervisors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nurses.filter(n => n.role === 'admin').length}
            </div>
            <p className="text-xs text-muted-foreground">
              System administrators
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Nurse Dialog - Custom Modal */}
      {isEditDialogOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => {
            console.log('🔄 Edit overlay clicked, closing dialog');
            setIsEditDialogOpen(false);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              minWidth: '500px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{marginBottom: '16px'}}>
              <h2 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '8px'}}>Edit Nurse</h2>
              <p style={{color: '#666', fontSize: '14px'}}>Update nurse information and save changes.</p>
            </div>
            
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Name <span style={{color: 'red'}}>*</span>
              </label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({...prev, name: e.target.value}))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Email <span style={{color: 'red'}}>*</span>
              </label>
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData(prev => ({...prev, email: e.target.value}))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Nurse ID
              </label>
              <input
                type="text"
                value={editFormData.nurseId}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed'
                }}
                readOnly
                disabled
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Role <span style={{color: 'red'}}>*</span>
              </label>
              <select
                value={editFormData.role}
                onChange={(e) => {
                  const role = e.target.value;
                  const level = role === 'admin' ? 3 : role === 'charge_nurse' ? 2 : 1;
                  setEditFormData(prev => ({...prev, role, hierarchyLevel: level}));
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="staff_nurse">Staff Nurse</option>
                <option value="charge_nurse">Charge Nurse</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Qualifications
              </label>
              <input
                type="text"
                value={editFormData.qualifications}
                onChange={(e) => setEditFormData(prev => ({...prev, qualifications: e.target.value}))}
                placeholder="RN, BSN, CCRN (comma separated)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Ward Access
              </label>
              <input
                type="text"
                value={editFormData.wardAccess}
                onChange={(e) => setEditFormData(prev => ({...prev, wardAccess: e.target.value}))}
                placeholder="ICU, General, Emergency (comma separated)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Years of Experience <span style={{color: 'red'}}>*</span>
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={editFormData.yearsOfExperience}
                onChange={(e) => setEditFormData(prev => ({...prev, yearsOfExperience: parseInt(e.target.value) || 0}))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
              <button
                onClick={() => {
                  console.log('🔄 Cancel edit clicked, closing dialog');
                  setIsEditDialogOpen(false);
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  backgroundColor: 'transparent',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  console.log('💾 Save edit clicked, form data:', editFormData);
                  
                  // Validate required fields
                  if (!editFormData.name.trim()) {
                    alert('Name is required');
                    return;
                  }
                  if (!editFormData.email.trim()) {
                    alert('Email is required');
                    return;
                  }
                  
                  try {
                    // Prepare data for API
                    const nurseData = {
                      name: editFormData.name.trim(),
                      email: editFormData.email.trim(),
                      role: editFormData.role,
                      nurseId: editFormData.nurseId, // Keep original ID
                      qualifications: editFormData.qualifications ? editFormData.qualifications.split(',').map(q => q.trim()).filter(q => q) : [],
                      wardAccess: editFormData.wardAccess ? editFormData.wardAccess.split(',').map(w => w.trim()).filter(w => w) : [],
                      hierarchyLevel: editFormData.hierarchyLevel,
                      yearsOfExperience: editFormData.yearsOfExperience
                    };
                    
                    console.log('🔄 Updating nurse via API:', nurseData);
                    
                    // Call API to update nurse
                    const result = await apiService.updateNurse(editingNurse!.id, nurseData);
                    
                    if (result.success) {
                      console.log('✅ Nurse updated successfully:', result.data);
                      alert('Nurse updated successfully!');
                      
                      // Close modal and refresh list
                      setIsEditDialogOpen(false);
                      
                      // Reload nurses list
                      await loadNurses();
                    } else {
                      console.error('❌ Failed to update nurse:', result.error);
                      alert('Failed to update nurse: ' + (result.error || 'Unknown error'));
                    }
                  } catch (error) {
                    console.error('❌ Error updating nurse:', error);
                    alert('Error updating nurse: ' + (error instanceof Error ? error.message : String(error)));
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Nurse Dialog - Force Visible Test */}
      {isAddDialogOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => {
            console.log('🔄 Overlay clicked, closing dialog');
            setIsAddDialogOpen(false);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              minWidth: '400px',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{marginBottom: '16px'}}>
              <h2 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '8px'}}>Add New Nurse</h2>
              <p style={{color: '#666', fontSize: '14px'}}>Enter nurse information to add them to the system.</p>
            </div>
            
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Name <span style={{color: 'red'}}>*</span>
              </label>
              <input
                type="text"
                value={addFormData.name}
                onChange={(e) => setAddFormData(prev => ({...prev, name: e.target.value}))}
                placeholder="Enter full name"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Email <span style={{color: 'red'}}>*</span>
              </label>
              <input
                type="email"
                value={addFormData.email}
                onChange={(e) => setAddFormData(prev => ({...prev, email: e.target.value}))}
                placeholder="Enter email address"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Role <span style={{color: 'red'}}>*</span>
              </label>
              <select
                value={addFormData.role}
                onChange={(e) => {
                  const role = e.target.value;
                  const level = role === 'admin' ? 3 : role === 'charge_nurse' ? 2 : 1;
                  setAddFormData(prev => ({...prev, role, hierarchyLevel: level}));
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="staff_nurse">Staff Nurse</option>
                <option value="charge_nurse">Charge Nurse</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Qualifications
              </label>
              <input
                type="text"
                value={addFormData.qualifications}
                onChange={(e) => setAddFormData(prev => ({...prev, qualifications: e.target.value}))}
                placeholder="RN, BSN, CCRN (comma separated)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Ward Access
              </label>
              <input
                type="text"
                value={addFormData.wardAccess}
                onChange={(e) => setAddFormData(prev => ({...prev, wardAccess: e.target.value}))}
                placeholder="ICU, General, Emergency (comma separated)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Years of Experience <span style={{color: 'red'}}>*</span>
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={addFormData.yearsOfExperience}
                onChange={(e) => setAddFormData(prev => ({...prev, yearsOfExperience: parseInt(e.target.value) || 0}))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'medium'}}>
                Nurse ID
              </label>
              <input
                type="text"
                value={addFormData.nurseId}
                onChange={(e) => setAddFormData(prev => ({...prev, nurseId: e.target.value}))}
                placeholder="Auto-generated"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#f5f5f5'
                }}
                readOnly
              />
            </div>

            <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
              <button
                onClick={() => {
                  console.log('🔄 Cancel clicked, closing dialog');
                  setIsAddDialogOpen(false);
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  backgroundColor: 'transparent',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  console.log('💾 Save clicked, form data:', addFormData);
                  
                  // Validate required fields
                  if (!addFormData.name.trim()) {
                    alert('Name is required');
                    return;
                  }
                  if (!addFormData.email.trim()) {
                    alert('Email is required');
                    return;
                  }
                  
                  try {
                    // Prepare data for API
                    const nurseData = {
                      name: addFormData.name.trim(),
                      email: addFormData.email.trim(),
                      role: addFormData.role,
                      nurseId: addFormData.nurseId || generateNurseId(),
                      qualifications: addFormData.qualifications ? addFormData.qualifications.split(',').map(q => q.trim()).filter(q => q) : [],
                      wardAccess: addFormData.wardAccess ? addFormData.wardAccess.split(',').map(w => w.trim()).filter(w => w) : [],
                      hierarchyLevel: addFormData.hierarchyLevel,
                      yearsOfExperience: addFormData.yearsOfExperience
                    };
                    
                    console.log('🔄 Sending to API:', nurseData);
                    
                    // Call API to create nurse
                    const result = await apiService.createNurse(nurseData);
                    
                    if (result.success) {
                      console.log('✅ Nurse created successfully:', result.data);
                      alert('Nurse added successfully!');
                      
                      // Close modal and refresh list
                      setIsAddDialogOpen(false);
                      
                      // Reset form
                      setAddFormData({
                        name: '',
                        email: '',
                        role: 'staff_nurse',
                        nurseId: '',
                        qualifications: '',
                        wardAccess: '',
                        hierarchyLevel: 1,
                        yearsOfExperience: 0
                      });
                      
                      // Reload nurses list
                      await loadNurses();
                    } else {
                      console.error('❌ Failed to create nurse:', result.error);
                      alert('Failed to add nurse: ' + (result.error || 'Unknown error'));
                    }
                  } catch (error) {
                    console.error('❌ Error creating nurse:', error);
                    alert('Error adding nurse: ' + (error instanceof Error ? error.message : String(error)));
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Add Nurse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Original Radix Dialog - Commented out for testing */}
      {false && (
        <Dialog 
          open={isAddDialogOpen} 
          onOpenChange={(open) => {
            console.log('🔄 Dialog onOpenChange called with:', open, 'from event');
            if (!open) {
              console.log('⚠️ Dialog is being closed, allowing it');
            }
            setIsAddDialogOpen(open);
          }}
        >
          <DialogContent>
            <div>Placeholder content</div>
          </DialogContent>
        </Dialog>
      )}

      {/* Simple Test Modal */}
      {showSimpleModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowSimpleModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              minWidth: '300px',
              maxWidth: '500px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{marginBottom: '10px'}}>Simple Test Modal</h2>
            <p>This is a simple modal to test if modals work at all.</p>
            <p>If you can see this, then modals work but there's an issue with the Radix Dialog component.</p>
            <button 
              onClick={() => setShowSimpleModal(false)}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Delete Nurse</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong>{nurseToDelete?.name}</strong>? 
              This action cannot be undone. The nurse will be permanently removed from the system.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={cancelDeleteNurse} 
                disabled={deleteLoading}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteNurse} 
                disabled={deleteLoading}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Radix AlertDialog - keeping as backup */}
      <AlertDialog 
        key={nurseToDelete?.id || 'delete-dialog'}
        open={false} 
        onOpenChange={(open) => {
          if (!open && !deleteLoading) {
            cancelDeleteNurse();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Nurse</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{nurseToDelete?.name}</strong>? 
              This action cannot be undone. The nurse will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteNurse} disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteNurse} 
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {deleteLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}