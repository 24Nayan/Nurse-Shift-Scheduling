import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminDashboard } from './components/AdminDashboard';
import NurseDashboardNew from './components/NurseDashboardNew';
import NurseAuth from './components/NurseAuth';

// Main App Component that uses auth context
function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <NurseAuth />;
  }

  // Route based on user role (only admins see admin dashboard)
  if (user.role === 'admin') {
    return <AdminDashboard user={user} />;
  } else {
    return <NurseDashboardNew />;
  }
}

// Main App wrapper with AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}