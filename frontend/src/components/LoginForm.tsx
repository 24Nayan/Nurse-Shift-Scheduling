import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { supabase } from "../utils/supabase/client";
import {
  projectId,
  publicAnonKey,
} from "../utils/supabase/info";

interface User {
  id: string;
  email: string;
  role: "admin" | "charge_nurse" | "staff_nurse";
  name: string;
  access_token: string;
}

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "staff_nurse" as
      | "admin"
      | "charge_nurse"
      | "staff_nurse",
    nurseId: "",
    qualifications: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initLoading, setInitLoading] = useState(false);

  const initializeDemoData = async () => {
    setInitLoading(true);
    try {
      console.log("🔄 Manually initializing demo data...");
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c76fcf04/init-demo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`, // Add anon key just in case
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Demo data initialized:", result);
        setError(
          "Demo data initialized successfully! You can now login.",
        );
        setTimeout(() => setError(""), 3000); // Clear success message after 3 seconds
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Demo initialization failed:",
          errorText,
        );
        setError(
          "Demo initialization failed. Users may already exist.",
        );
      }
    } catch (error) {
      console.error("❌ Demo initialization error:", error);
      setError(
        "Demo initialization failed. Please try logging in directly.",
      );
    } finally {
      setInitLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (authError) throw authError;
      if (!session?.access_token)
        throw new Error("No session created");

      // Fetch user profile from server
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c76fcf04/auth/profile`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Failed to fetch user profile: ${errorData}`,
        );
      }

      const userData = await response.json();

      onLogin({
        id: session.user.id,
        email: session.user.email!,
        role: userData.role,
        name: userData.name,
        access_token: session.access_token,
      });
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c76fcf04/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(signupForm),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Signup failed: ${errorData}`);
      }

      const result = await response.json();

      // Automatically log in after successful signup
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: signupForm.email,
        password: signupForm.password,
      });

      if (authError) throw authError;
      if (!session?.access_token)
        throw new Error("No session created after signup");

      onLogin({
        id: session.user.id,
        email: session.user.email!,
        role: signupForm.role,
        name: signupForm.name,
        access_token: session.access_token,
      });
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            NurseScheduler
          </h1>
          <p className="mt-2 text-gray-600">
            Hospital Nurse Shift Management System
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login to Your Account</CardTitle>
                <CardDescription>
                  Enter your credentials to access the
                  scheduling system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="nurse@hospital.com"
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">
                      Password
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create New Account</CardTitle>
                <CardDescription>
                  Register as a new nurse in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleSignup}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">
                      Full Name
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Jane Smith, RN"
                      value={signupForm.name}
                      onChange={(e) =>
                        setSignupForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="jane.smith@hospital.com"
                      value={signupForm.email}
                      onChange={(e) =>
                        setSignupForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-nurse-id">
                      Nurse ID
                    </Label>
                    <Input
                      id="signup-nurse-id"
                      type="text"
                      placeholder="N12345"
                      value={signupForm.nurseId}
                      onChange={(e) =>
                        setSignupForm((prev) => ({
                          ...prev,
                          nurseId: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Role</Label>
                    <select
                      id="signup-role"
                      value={signupForm.role}
                      onChange={(e) =>
                        setSignupForm((prev) => ({
                          ...prev,
                          role: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="staff_nurse">
                        Staff Nurse
                      </option>
                      <option value="charge_nurse">
                        Charge Nurse
                      </option>
                      <option value="admin">
                        Administrator
                      </option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-qualifications">
                      Qualifications/Certifications
                    </Label>
                    <Input
                      id="signup-qualifications"
                      type="text"
                      placeholder="RN, BSN, ACLS, PALS"
                      value={signupForm.qualifications}
                      onChange={(e) =>
                        setSignupForm((prev) => ({
                          ...prev,
                          qualifications: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupForm.password}
                      onChange={(e) =>
                        setSignupForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading
                      ? "Creating Account..."
                      : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Demo Login Credentials
            </CardTitle>
            <CardDescription className="text-sm text-gray-700">
              Use these credentials to explore the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
              <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                Admin Dashboard Access
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">Email:</span>{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded text-blue-600">
                    admin@hospital.com
                  </code>
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Password:</span>{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded text-blue-600">
                    admin123
                  </code>
                </p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
              <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                Nurse Account Access
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">Email:</span>{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded text-blue-600">
                    nurse@hospital.com
                  </code>
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Password:</span>{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded text-blue-600">
                    nurse123
                  </code>
                </p>
              </div>
            </div>

            <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
              <p className="font-medium">
                ⚡ First-time setup: Demo users are created
                automatically.
              </p>
              <p>If login fails, wait a moment and try again.</p>
            </div>

            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={initializeDemoData}
                disabled={initLoading}
                className="w-full text-xs"
              >
                {initLoading
                  ? "Initializing..."
                  : "Initialize Demo Data"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}