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

  // Route based on user role
  if (user.role === 'admin' || user.role === 'charge_nurse') {
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

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize demo data first
      await initializeDemoData();
      
      // Then check for existing session
      await checkExistingSession();
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDemoData = async () => {
    try {
      console.log('Skipping Supabase demo data initialization - using local backend');
      // Temporarily disable Supabase initialization
      return;
      
      console.log('Initializing demo data...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c76fcf04/init-demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`, // Add anon key just in case
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Demo data initialization result:', result);
        if (result.success) {
          console.log('Demo data successfully initialized');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Demo data initialization failed:', errorText);
        
        // If initialization fails, the demo users might still exist from a previous run
        console.log('Demo users may already exist. This is not necessarily an error.');
      }
    } catch (error) {
      console.error('❌ Demo initialization error:', error);
      console.log('This is normal on first load. Demo users may already exist.');
    }
  };

  const checkExistingSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.access_token) {
        // Fetch user profile from server
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c76fcf04/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser({
            id: session.user.id,
            email: session.user.email!,
            role: userData.role,
            name: userData.name,
            access_token: session.access_token,
          });
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">NurseScheduler</h1>
              </div>
              <div className="ml-4">
                <span className="text-sm text-gray-500">Hospital Nurse Shift Management</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {user.role === 'admin' || user.role === 'charge_nurse' ? (
          <AdminDashboard user={user} />
        ) : (
          <NurseDashboard user={user} />
        )}
      </main>
    </div>
  );
}