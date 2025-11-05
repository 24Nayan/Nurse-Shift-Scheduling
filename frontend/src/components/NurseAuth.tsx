import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Eye, EyeOff, UserCheck, Lock, Shield } from 'lucide-react';

const NurseAuth = () => {
  const { login, signup, isLoading, error, clearError } = useAuth() as any;
  
  // Login state
  const [loginData, setLoginData] = useState({
    nurseId: '',
    password: ''
  });
  
  // Signup state
  const [signupData, setSignupData] = useState({
    nurseId: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState({
    login: false,
    signup: false,
    confirm: false
  });
  
  const [activeTab, setActiveTab] = useState('login');

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();

    if (!loginData.nurseId || !loginData.password) {
      return;
    }
    
    try {
      await login(loginData.nurseId, loginData.password);
      // Redirect will be handled by the app router
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Handle signup form submission
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();
    
    if (!signupData.nurseId || !signupData.password || !signupData.confirmPassword) {
      return;
    }
    
    if (signupData.password !== signupData.confirmPassword) {
      return;
    }
    
    try {
      await signup(signupData.nurseId, signupData.password, signupData.confirmPassword);
      // Redirect will be handled by the app router
    } catch (error) {
      console.error('Signup failed:', error);
    }
  };

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignupData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Nurse Scheduling System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your schedule and manage your availability
          </p>
        </div>

        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Activate Account</TabsTrigger>
            </TabsList>
            
            {/* Error Alert */}
            {error && (
              <div className="p-4">
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Login Tab */}
            <TabsContent value="login">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Login to Your Account
                </CardTitle>
                <CardDescription>
                  Enter your Nurse ID and password to access your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-nurseId">Nurse ID or Admin Email</Label>
                    <Input
                      id="login-nurseId"
                      name="nurseId"
                      type="text"
                      placeholder="N0001 or admin@hospital.com"
                      value={loginData.nurseId}
                      onChange={handleLoginInputChange}
                      required
                      disabled={isLoading}
                      className=""
                      title="Enter Nurse ID (e.g., N0001) or admin email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        name="password"
                        type={showPassword.login ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={handleLoginInputChange}
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('login')}
                        disabled={isLoading}
                      >
                        {showPassword.login ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !loginData.nurseId || !loginData.password}
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Activate Your Account
                </CardTitle>
                <CardDescription>
                  Use your assigned Nurse ID to activate your account and set up your password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-nurseId">Nurse ID</Label>
                    <Input
                      id="signup-nurseId"
                      name="nurseId"
                      type="text"
                      placeholder="N0001"
                      value={signupData.nurseId}
                      onChange={handleSignupInputChange}
                      required
                      disabled={isLoading}
                      className="uppercase"
                      pattern="N\d{4}"
                      title="Please enter your assigned Nurse ID (e.g., N0001)"
                    />
                    <p className="text-xs text-gray-500">
                      Enter the Nurse ID provided by your administrator
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword.signup ? "text" : "password"}
                        placeholder="Create a secure password"
                        value={signupData.password}
                        onChange={handleSignupInputChange}
                        required
                        disabled={isLoading}
                        className="pr-10"
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('signup')}
                        disabled={isLoading}
                      >
                        {showPassword.signup ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-confirmPassword"
                        name="confirmPassword"
                        type={showPassword.confirm ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={signupData.confirmPassword}
                        onChange={handleSignupInputChange}
                        required
                        disabled={isLoading}
                        className="pr-10"
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('confirm')}
                        disabled={isLoading}
                      >
                        {showPassword.confirm ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {signupData.password && signupData.confirmPassword && 
                     signupData.password !== signupData.confirmPassword && (
                      <p className="text-xs text-red-500">
                        Passwords do not match
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={
                      isLoading || 
                      !signupData.nurseId || 
                      !signupData.password || 
                      !signupData.confirmPassword ||
                      signupData.password !== signupData.confirmPassword
                    }
                  >
                    {isLoading ? 'Activating Account...' : 'Activate Account'}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Contact your administrator for assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NurseAuth;