import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, Calendar, Building2, AlertCircle, Clock, UserCheck } from 'lucide-react';
import { NurseManagement } from './NurseManagement';
import { ScheduleGenerator } from './ScheduleGenerator';
import { ScheduleViewer } from './ScheduleViewer';
import WardManagement from './WardManagement';
import { projectId } from '../utils/supabase/info';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'charge_nurse' | 'staff_nurse';
  name: string;
  access_token: string;
}

interface AdminDashboardProps {
  user: User;
}

interface DashboardStats {
  totalNurses: number;
  activeSchedules: number;
  totalWards: number;
  upcomingShifts: number;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalNurses: 0,
    activeSchedules: 0,
    totalWards: 0,
    upcomingShifts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
    // Remove the duplicate demo initialization since it's now handled in App.tsx
  }, []);

  const initializeDemoData = async () => {
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c76fcf04/init-demo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
        },
      });
    } catch (error) {
      console.error('Demo initialization error:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load nurses
      const nursesResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c76fcf04/nurses`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
        },
      });
      
      const nurses = nursesResponse.ok ? await nursesResponse.json() : [];

      // Load wards
      const wardsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c76fcf04/wards`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
        },
      });
      
      const wards = wardsResponse.ok ? await wardsResponse.json() : [];

      // Load current week schedule
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      
      const scheduleResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c76fcf04/schedule?startDate=${startOfWeek.toISOString().split('T')[0]}&endDate=${endOfWeek.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
          },
        }
      );
      
      const scheduleData = scheduleResponse.ok ? await scheduleResponse.json() : { schedule: [] };

      setStats({
        totalNurses: nurses.length,
        activeSchedules: scheduleData.schedule ? 1 : 0,
        totalWards: wards.length,
        upcomingShifts: scheduleData.schedule ? scheduleData.schedule.length : 0,
      });
    } catch (error) {
      console.error('Dashboard data loading error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatsCard = ({ title, value, icon: Icon, description }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

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
        <h1 className="text-3xl font-bold text-gray-900">
          {user.role === 'admin' ? 'Administrator' : 'Charge Nurse'} Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Manage nurses, schedules, and ward assignments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Nurses"
          value={stats.totalNurses}
          icon={Users}
          description="Registered in the system"
        />
        <StatsCard
          title="Active Schedules"
          value={stats.activeSchedules}
          icon={Calendar}
          description="Current scheduling periods"
        />
        <StatsCard
          title="Hospital Wards"
          value={stats.totalWards}
          icon={Building2}
          description="Departments requiring coverage"
        />
        <StatsCard
          title="Upcoming Shifts"
          value={stats.upcomingShifts}
          icon={Clock}
          description="This week's assignments"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="nurses">Nurses</TabsTrigger>
          <TabsTrigger value="wards">Wards</TabsTrigger>
          <TabsTrigger value="generate">Generate Schedule</TabsTrigger>
          <TabsTrigger value="schedule">View Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Current system status and quick actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">System Status</span>
                  <Badge variant="default">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Schedule Generated</span>
                  <span className="text-sm text-gray-500">Today</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Coverage Status</span>
                  <Badge variant="secondary">85% Complete</Badge>
                </div>
                <Button className="w-full" onClick={() => loadDashboardData()}>
                  Refresh Data
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Add New Nurse
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Generate This Week's Schedule
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="mr-2 h-4 w-4" />
                  Manage Ward Requirements
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  View Coverage Gaps
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full justify-start"
                  onClick={async () => {
                    try {
                      const response = await fetch('http://localhost:5000/api/nurses');
                      const data = await response.json();
                      alert(`API Test Success! Found ${data.length} nurses in database`);
                    } catch (error) {
                      alert('API Test Failed: ' + (error instanceof Error ? error.message : String(error)));
                    }
                  }}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Test Backend Connection
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    // Force navigate to Nurses tab to test Add Nurse button
                    const nursesTab = document.querySelector('[value="nurses"]') as HTMLElement;
                    if (nursesTab) {
                      nursesTab.click();
                      setTimeout(() => {
                        console.log('🧪 Navigated to Nurses tab, now test Add Nurse button');
                      }, 100);
                    }
                  }}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Go to Nurses Tab
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system activities and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-600">Schedule generated for current week</span>
                  <span className="ml-auto text-gray-400">2 hours ago</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-gray-600">New nurse Emily Rodriguez registered</span>
                  <span className="ml-auto text-gray-400">1 day ago</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                  <span className="text-gray-600">ICU ward requirements updated</span>
                  <span className="ml-auto text-gray-400">2 days ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nurses">
          <NurseManagement user={user} />
        </TabsContent>

        <TabsContent value="wards">
          <WardManagement />
        </TabsContent>

        <TabsContent value="generate">
          <ScheduleGenerator user={user} onScheduleGenerated={loadDashboardData} />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleViewer user={user} />
        </TabsContent>
      </Tabs>
    </div>
  )
}