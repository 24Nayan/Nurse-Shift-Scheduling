import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  CalendarDays,
  Moon,
  Sun,
  Sunset,
  Filter
} from 'lucide-react';

interface UnavailableDate {
  date: string;
  shifts: string[];
  dateString: string;
}

interface AdminResponse {
  message?: string;
  respondedBy?: string;
  respondedAt?: string;
}

interface UnavailabilityRequest {
  _id: string;
  requestId: string;
  nurseId: string;
  nurseName: string;
  nurseCode: string;
  unavailableDates: UnavailableDate[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  priority: number;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  adminResponse?: AdminResponse;
}

const RequestManagement = () => {
  const { apiCall } = useAuth() as any;
  const [requests, setRequests] = useState<UnavailabilityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall('/unavailability/all');
      setRequests(response.data || []);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      setError('Failed to load unavailability requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const message = "Your request has been approved. You will not be scheduled for the requested dates and shifts.";
      await apiCall(`/unavailability/${requestId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ message })
      });
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req._id === requestId 
            ? { ...req, status: 'approved', adminResponse: { message } }
            : req
        )
      );
      
      // Show success message
      alert('Request approved successfully!');
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert('Failed to approve request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const message = prompt('Please provide a reason for rejection (optional):');
      
      await apiCall(`/unavailability/${requestId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          message: message || 'Your request has been rejected. Please contact administration for details.'
        })
      });
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req._id === requestId 
            ? { ...req, status: 'rejected', adminResponse: { message: message || 'Rejected' } }
            : req
        )
      );
      
      alert('Request rejected.');
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const getShiftIcon = (shift: string) => {
    switch (shift) {
      case 'DAY':
        return <Sun className="h-3 w-3" />;
      case 'EVENING':
        return <Sunset className="h-3 w-3" />;
      case 'NIGHT':
        return <Moon className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      approved: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
      expired: { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" /> }
    };
    
    const { variant, icon } = variants[status] || variants.pending;
    
    return (
      <Badge variant={variant} className="flex items-center w-fit">
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Unavailability Requests</h2>
          <p className="text-gray-600 mt-1">Review and approve nurse unavailability requests</p>
        </div>
        <Button onClick={fetchRequests} variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Important Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Approved requests are automatically treated as hard constraints 
          in schedule generation. Nurses will NOT be assigned to shifts on their approved unavailable dates.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="pending" onValueChange={(v: string) => setFilter(v as 'all' | 'pending' | 'approved' | 'rejected')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4 mt-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarDays className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg">No {filter !== 'all' ? filter : ''} requests found</p>
                <p className="text-gray-500 text-sm mt-2">
                  {filter === 'pending' 
                    ? 'All caught up! No pending requests to review.' 
                    : `There are no ${filter} requests at this time.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request._id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{request.nurseName}</CardTitle>
                        <CardDescription className="flex items-center space-x-2 mt-1">
                          <span>ID: {request.nurseCode}</span>
                          <span>•</span>
                          <span>Request: {request.requestId}</span>
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  {/* Request Details */}
                  <div className="space-y-4">
                    {/* Reason */}
                    {request.reason && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Reason:</h4>
                        <p className="text-gray-600 text-sm">{request.reason}</p>
                      </div>
                    )}

                    {/* Unavailable Dates */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Unavailable Dates & Shifts:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {request.unavailableDates.map((dateItem, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                          >
                            <div className="flex items-center space-x-2 mb-2">
                              <Calendar className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-sm">
                                {formatDate(dateItem.date)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {dateItem.shifts.map((shift) => (
                                <Badge
                                  key={shift}
                                  variant="outline"
                                  className="flex items-center space-x-1"
                                >
                                  {getShiftIcon(shift)}
                                  <span>{shift}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Valid Until</p>
                        <p className="text-sm font-medium">{formatDate(request.validUntil)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Submitted</p>
                        <p className="text-sm font-medium">{formatDate(request.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Priority</p>
                        <Badge variant={request.priority > 2 ? 'destructive' : 'secondary'}>
                          Level {request.priority}
                        </Badge>
                      </div>
                    </div>

                    {/* Admin Response */}
                    {request.adminResponse && request.adminResponse.message && (
                      <div className={`border rounded-lg p-3 ${
                        request.status === 'approved' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <p className={`text-xs font-semibold mb-1 ${
                          request.status === 'approved' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          Admin Response:
                        </p>
                        <p className={`text-sm ${
                          request.status === 'approved' ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {request.adminResponse.message}
                        </p>
                        {request.adminResponse.respondedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Responded on {formatDate(request.adminResponse.respondedAt)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {request.status === 'pending' && (
                      <div className="flex space-x-3 pt-4">
                        <Button
                          onClick={() => handleApprove(request._id)}
                          disabled={actionLoading === request._id}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {actionLoading === request._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve Request
                        </Button>
                        <Button
                          onClick={() => handleReject(request._id)}
                          disabled={actionLoading === request._id}
                          variant="destructive"
                          className="flex-1"
                        >
                          {actionLoading === request._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Reject Request
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RequestManagement;
