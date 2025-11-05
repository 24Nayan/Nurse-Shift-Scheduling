import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
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
import UnavailabilityRequestForm from './UnavailabilityRequestForm';

// Types for dashboard and notifications
type ShiftType = 'DAY' | 'EVENING' | 'NIGHT' | string;

interface ShiftItem {
  shift: ShiftType;
  date: string;
  ward: string;
  hours: number;
}

interface ShiftDistribution {
  DAY?: number;
  EVENING?: number;
  NIGHT?: number;
  [key: string]: number | undefined;
}

interface DashboardStatistics {
  hoursThisWeek?: number;
  shiftsThisWeek?: number;
  hoursNext30Days?: number;
  shiftsNext30Days?: number;
  unreadNotifications?: number;
  shiftDistribution?: ShiftDistribution;
}

interface DashboardData {
  statistics?: DashboardStatistics;
  upcomingShifts?: ShiftItem[];
  weeklySchedule?: Record<string, {
    date?: string;
    shifts: Record<string, {
      nurseId?: string;
      nurseName?: string;
      hours?: number;
      ward?: string;
    }>;
    ward?: string;
  }>;
  nurse?: {
    id: string;
    nurseId: string;
    name: string;
    role: string;
    wardAccess: string[];
  };
}

interface NotificationItem {
  _id: string;
  notificationId: string;
  status: 'read' | 'unread' | string;
  title: string;
  message: string;
  createdAt: string;
}

const NurseDashboardNew = () => {
  const { user, logout, apiCall } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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
      console.log('NurseDashboardNew: Fetching dashboard data...');
      const response = await apiCall('/dashboard');
      console.log('NurseDashboardNew: Received dashboard response:', response);
      console.log('NurseDashboardNew: Dashboard data:', response.data);
      console.log('NurseDashboardNew: Weekly schedule:', response.data?.weeklySchedule);
      console.log('NurseDashboardNew: Statistics:', response.data?.statistics);
      setDashboardData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('NurseDashboardNew: Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : String(error));
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await apiCall('/notifications/my');
      setNotifications((response.data.notifications || []) as NotificationItem[]);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await apiCall(`/notifications/${notificationId}/read`, { method: 'PATCH' });
      setNotifications((prev) => 
        prev.map((notif) => 
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

  const getShiftIcon = (shiftType: ShiftType) => {
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

  const getShiftColor = (shiftType: ShiftType) => {
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
    <div className="min-h-screen bg-gray-50" style={{ colorScheme: 'light' }}>
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
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-gray-300 text-gray-700 hover:bg-gray-50">
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
          <Card className="!bg-white !border-gray-200 !shadow-sm !text-gray-900 [&_*]:!text-inherit">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium !text-gray-900">This Week</CardTitle>
              <Clock className="h-4 w-4 !text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold !text-gray-900">
                {dashboardData?.statistics?.hoursThisWeek ?? 0}h
              </div>
              <p className="text-xs !text-gray-600">
                {dashboardData?.statistics?.shiftsThisWeek ?? 0} shifts scheduled
              </p>
            </CardContent>
          </Card>

          <Card className="!bg-white !border-gray-200 !shadow-sm !text-gray-900 [&_*]:!text-inherit">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium !text-gray-900">Next 30 Days</CardTitle>
              <Calendar className="h-4 w-4 !text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold !text-gray-900">
                {dashboardData?.statistics?.hoursNext30Days || 0}h
              </div>
              <p className="text-xs !text-gray-600">
                {dashboardData?.statistics?.shiftsNext30Days || 0} shifts total
              </p>
            </CardContent>
          </Card>

          <Card className="!bg-white !border-gray-200 !shadow-sm !text-gray-900 [&_*]:!text-inherit">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium !text-gray-900">Notifications</CardTitle>
              <Bell className="h-4 w-4 !text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold !text-gray-900">
                {dashboardData?.statistics?.unreadNotifications || 0}
              </div>
              <p className="text-xs !text-gray-600">
                Unread messages
              </p>
            </CardContent>
          </Card>

          <Card className="!bg-white !border-gray-200 !shadow-sm !text-gray-900 [&_*]:!text-inherit">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium !text-gray-900">Ward Access</CardTitle>
              <User className="h-4 w-4 !text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold !text-gray-900">
                {user?.wardAccess?.length || 0}
              </div>
              <p className="text-xs !text-gray-600">
                Wards assigned
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="schedule" className="w-full mb-6">
          <TabsList 
            className="!grid !w-full !grid-cols-4 !bg-gray-100 !border !border-gray-300 !rounded-lg !p-1.5 !gap-1 !h-auto"
            style={{ 
              backgroundColor: '#f3f4f6',
              borderColor: '#d1d5db',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              width: '100%',
              gap: '0.25rem'
            }}
          >
            <TabsTrigger 
              value="schedule"
              className="!flex !items-center !justify-center !px-4 !py-2.5 !rounded-md !text-sm !font-semibold !cursor-pointer !transition-all !border-0 !bg-transparent !text-gray-700 hover:!bg-gray-200 hover:!text-gray-900 data-[state=active]:!bg-white data-[state=active]:!text-gray-900 data-[state=active]:!shadow-md"
              style={{
                backgroundColor: 'transparent',
                color: '#374151',
                fontWeight: '600'
              }}
            >
              My Schedule
            </TabsTrigger>
            <TabsTrigger 
              value="notifications"
              className="!flex !items-center !justify-center !px-4 !py-2.5 !rounded-md !text-sm !font-semibold !cursor-pointer !transition-all !border-0 !bg-transparent !text-gray-700 hover:!bg-gray-200 hover:!text-gray-900 data-[state=active]:!bg-white data-[state=active]:!text-gray-900 data-[state=active]:!shadow-md"
              style={{
                backgroundColor: 'transparent',
                color: '#374151',
                fontWeight: '600'
              }}
            >
              Notifications 
              {notifications.filter(n => n.status !== 'read').length > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-xs font-bold">
                  {notifications.filter(n => n.status !== 'read').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="unavailability"
              className="!flex !items-center !justify-center !px-4 !py-2.5 !rounded-md !text-sm !font-semibold !cursor-pointer !transition-all !border-0 !bg-transparent !text-gray-700 hover:!bg-gray-200 hover:!text-gray-900 data-[state=active]:!bg-white data-[state=active]:!text-gray-900 data-[state=active]:!shadow-md"
              style={{
                backgroundColor: 'transparent',
                color: '#374151',
                fontWeight: '600'
              }}
            >
              Unavailability
            </TabsTrigger>
            <TabsTrigger 
              value="profile"
              className="!flex !items-center !justify-center !px-4 !py-2.5 !rounded-md !text-sm !font-semibold !cursor-pointer !transition-all !border-0 !bg-transparent !text-gray-700 hover:!bg-gray-200 hover:!text-gray-900 data-[state=active]:!bg-white data-[state=active]:!text-gray-900 data-[state=active]:!shadow-md"
              style={{
                backgroundColor: 'transparent',
                color: '#374151',
                fontWeight: '600'
              }}
            >
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid gap-6">
              {/* Weekly Schedule */}
              <Card className="!bg-white !border-gray-200 !text-gray-900 [&_*]:!text-inherit">
                <CardHeader>
                  <CardTitle className="flex items-center !text-gray-900 !font-semibold">
                    <CalendarDays className="h-5 w-5 mr-2 !text-blue-600" />
                    This Week's Schedule
                  </CardTitle>
                  <CardDescription className="!text-gray-600">
                    Your scheduled shifts for this week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData?.weeklySchedule && Object.keys(dashboardData.weeklySchedule).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(dashboardData.weeklySchedule)
                        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                        .map(([dateKey, dayData]: [string, any]) => {
                          const shifts = dayData.shifts || {};
                          const shiftTypes = Object.keys(shifts).sort();
                          
                          return shiftTypes.map((shiftType: string) => {
                            const shift = shifts[shiftType];
                            if (!shift) return null;
                            
                            return (
                              <div key={`${dateKey}-${shiftType}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center space-x-3">
                                  {getShiftIcon(shiftType)}
                                  <div>
                                    <p className="font-medium">{formatDate(dateKey)}</p>
                                    <p className="text-sm text-gray-600">
                                      {shift.nurseName || user?.name || 'Nurse'} • {shift.ward || dayData.ward || 'Ward'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge className={getShiftColor(shiftType)}>
                                    {shiftType}
                                  </Badge>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {shift.hours || (shiftType === 'NIGHT' ? 12 : 8)}h
                                  </p>
                                </div>
                              </div>
                            );
                          });
                        }).flat().filter(Boolean)}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No shifts scheduled for this week
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Shifts */}
              <Card className="!bg-white !border-gray-200 !text-gray-900 [&_*]:!text-inherit">
                <CardHeader>
                  <CardTitle className="flex items-center !text-gray-900 !font-semibold">
                    <Calendar className="h-5 w-5 mr-2 !text-blue-600" />
                    Upcoming Shifts
                  </CardTitle>
                  <CardDescription className="!text-gray-600">
                    Your next scheduled shifts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(dashboardData?.upcomingShifts?.length ?? 0) > 0 ? (
                    <div className="space-y-3">
                      {(dashboardData?.upcomingShifts ?? []).slice(0, 5).map((shift: ShiftItem, index: number) => (
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
              <Card className="!bg-white !border-gray-200 !text-gray-900 [&_*]:!text-inherit">
                <CardHeader>
                  <CardTitle className="!text-gray-900 !font-semibold">Shift Distribution (This Week)</CardTitle>
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
            <Card className="!bg-white !border-gray-200 !text-gray-900 [&_*]:!text-inherit">
              <CardHeader>
                <CardTitle className="flex items-center !text-gray-900 !font-semibold">
                  <Bell className="h-5 w-5 mr-2 !text-blue-600" />
                  Recent Notifications
                </CardTitle>
                <CardDescription className="!text-gray-600">
                  Your recent notifications and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notification: NotificationItem) => (
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

          {/* Unavailability Tab */}
          <TabsContent value="unavailability" className="space-y-6">
            <UnavailabilityRequestForm />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="!bg-white !border-gray-200 !text-gray-900 [&_*]:!text-inherit">
              <CardHeader>
                <CardTitle className="flex items-center !text-gray-900 !font-semibold">
                  <User className="h-5 w-5 mr-2 !text-blue-600" />
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

export default NurseDashboardNew;