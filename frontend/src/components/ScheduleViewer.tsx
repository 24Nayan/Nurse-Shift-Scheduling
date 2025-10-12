import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Eye } from 'lucide-react';

const ScheduleViewer: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Eye className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Schedule Viewer</CardTitle>
              <CardDescription>View existing nurse shift assignments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Schedule viewing functionality will be implemented here.</p>
            <p className="text-sm text-gray-400 mt-2">
              For now, please use the Generate Schedule tab to create and view schedules.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleViewer;
