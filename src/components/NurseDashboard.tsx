import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../frontend/src/components/ui/card';
import { Button } from '../../frontend/src/components/ui/button';
import { Badge } from '../../frontend/src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../frontend/src/components/ui/tabs';
import { Alert, AlertDescription } from '../../frontend/src/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  Bell, 
  User, 
  LogOut, 
  Settings,
  CalendarDays,
  Activity,
  CheckCircle,
  AlertCircle,
  Users,
  Moon,
  Sun,
  Sunset
} from 'lucide-react';

interface Notification {
  _id: string;
  notificationId: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
}

interface DashboardData {
  statistics?: {
    hoursThisWeek?: number;
    shiftsThisWeek?: number;
    hoursNext30Days?: number;
    shiftsNext30Days?: number;
    unreadNotifications?: number;
    shiftDistribution?: {
      DAY?: number;
      EVENING?: number;
      NIGHT?: number;
    };
  };
  upcomingShifts?: Array<{
    date: string;
    shift: string;
    ward: string;
    hours: number;
  }>;
}

const NurseDashboard = () => {
  const { user, logout, apiCall } = useAuth() as any;
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await apiCall('/notifications/my');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await apiCall(`/notifications/${notificationId}/read`, { method: 'PATCH' });
      setNotifications(prev => 
        prev.map(notif => 
          notif.notificationId === notificationId 
            ? { ...notif, status: 'read' }
            : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getShiftIcon = (shiftType: string) => {
    switch (shiftType?.toUpperCase()) {
      case 'DAY':
        return <Sun className="h-4 w-4" />;
      case 'EVENING':
        return <Sunset className="h-4 w-4" />;
      case 'NIGHT':
        return <Moon className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getShiftColor = (shiftType: string) => {
    switch (shiftType?.toUpperCase()) {
      case 'DAY':
        return 'bg-yellow-100 text-yellow-800';
      case 'EVENING':
        return 'bg-orange-100 text-orange-800';
      case 'NIGHT':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome, {user?.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {user?.nurseId} • {user?.role?.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.statistics?.hoursThisWeek || 0}h
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData?.statistics?.shiftsThisWeek || 0} shifts scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next 30 Days</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.statistics?.hoursNext30Days || 0}h
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData?.statistics?.shiftsNext30Days || 0} shifts total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.statistics?.unreadNotifications || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Unread messages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ward Access</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user?.wardAccess?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Wards assigned
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule">My Schedule</TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications 
              {notifications.filter(n => n.status !== 'read').length > 0 && (
                <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs">
                  {notifications.filter(n => n.status !== 'read').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid gap-6">
              {/* Upcoming Shifts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalendarDays className="h-5 w-5 mr-2" />
                    Upcoming Shifts
                  </CardTitle>
                  <CardDescription>
                    Your next scheduled shifts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(dashboardData && Array.isArray(dashboardData.upcomingShifts) && dashboardData.upcomingShifts.length > 0) ? (
                    <div className="space-y-3">
                      {dashboardData.upcomingShifts.slice(0, 5).map((shift, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getShiftIcon(shift.shift)}
                            <div>
                              <p className="font-medium">{formatDate(shift.date)}</p>
                              <p className="text-sm text-gray-600">{shift.ward}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getShiftColor(shift.shift)}>
                              {shift.shift}
                            </Badge>
                            <p className="text-sm text-gray-600 mt-1">
                              {shift.hours}h
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No upcoming shifts scheduled
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Shift Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Shift Distribution (Next 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Sun className="h-6 w-6 text-yellow-600" />
                      </div>
                      <p className="text-2xl font-bold">
                        {dashboardData?.statistics?.shiftDistribution?.DAY || 0}
                      </p>
                      <p className="text-sm text-gray-600">Day Shifts</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Sunset className="h-6 w-6 text-orange-600" />
                      </div>
                      <p className="text-2xl font-bold">
                        {dashboardData?.statistics?.shiftDistribution?.EVENING || 0}
                      </p>
                      <p className="text-sm text-gray-600">Evening Shifts</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Moon className="h-6 w-6 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold">
                        {dashboardData?.statistics?.shiftDistribution?.NIGHT || 0}
                      </p>
                      <p className="text-sm text-gray-600">Night Shifts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Recent Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div 
                        key={notification._id}
                        className={`p-4 rounded-lg border ${
                          notification.status === 'read' 
                            ? 'bg-gray-50 border-gray-200' 
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{notification.title}</h4>
                              {notification.status !== 'read' && (
                                <Badge variant="secondary" className="text-xs">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatTime(notification.createdAt)} • {formatDate(notification.createdAt)}
                            </p>
                          </div>
                          {notification.status !== 'read' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markNotificationAsRead(notification.notificationId)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No notifications available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nurse ID</label>
                    <p className="text-lg">{user?.nurseId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-lg">{user?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-lg">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <p className="text-lg capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Ward Access</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user?.wardAccess?.map((ward: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {ward}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Qualifications</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user?.qualifications?.map((qual: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {qual}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NurseDashboard;
