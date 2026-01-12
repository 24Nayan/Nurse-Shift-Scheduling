import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Types
interface AuthState {
  user: any;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthContextType = AuthState & {
  login: (nurseId: string, password: string) => Promise<any>;
  signup: (nurseId: string, password: string, confirmPassword: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshAuthToken: () => Promise<{ token: string; refreshToken: string }>;
  updateProfile: (updates: Record<string, unknown>) => Promise<any>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<any>;
  clearError: () => void;
  apiCall: (
    endpoint: string,
    options?: Omit<RequestInit, 'headers' | 'body'> & {
      headers?: Record<string, string>;
      body?: any;
    }
  ) => Promise<any>;
};

// Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Actions
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SIGNUP_START: 'SIGNUP_START',
  SIGNUP_SUCCESS: 'SIGNUP_SUCCESS',
  SIGNUP_FAILURE: 'SIGNUP_FAILURE',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_PROFILE: 'UPDATE_PROFILE'
};

// Initial state
const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

// Auth Reducer
const authReducer = (state: AuthState, action: { type: string; payload?: any }): AuthState => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.SIGNUP_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.SIGNUP_SUCCESS:
      return {
        ...state,
        user: action.payload.nurse,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.SIGNUP_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState
      };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    case AUTH_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    default:
      return state;
  }
};

// API Base URL
// Note: Backend defaults to port 5000 (see backend/server.js)
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://nurse-shift-scheduling-1.onrender.com/api'
  : 'http://localhost:5000/api';

// Auth Provider Component
import { ReactNode, FC } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load auth data from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            nurse: user,
            token,
            refreshToken
          }
        });
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
      }
    }
  }, []);

  // Save auth data to localStorage
  const saveAuthData = (token: string, refreshToken: string, user: any) => {
    try {
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userData', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save authentication data to localStorage:', error);
    }
  };


  // Clear auth data from localStorage
  const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  };

  // API call helper with auth headers
  const apiCall = async (
    endpoint: string,
    options: Omit<RequestInit, 'headers' | 'body'> & { headers?: Record<string, string>; body?: any } = {}
  ) => {
    const url = `${API_BASE_URL}${endpoint}`;

    const { body, headers, ...rest } = options as {
      body?: any;
      headers?: Record<string, string>;
    } & Omit<RequestInit, 'headers' | 'body'>;

    const config: RequestInit & { headers: Record<string, string> } = {
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {})
      },
      ...rest
    };

    // Attach token from state or fallback to localStorage
    const bearer = state.token || localStorage.getItem('authToken');
    if (bearer) {
      config.headers.Authorization = `Bearer ${bearer}`;
    }

    if (body !== undefined && body !== null) {
      config.body = typeof body === 'object' ? JSON.stringify(body) : body;
    }

    try {
      console.log(`API Call: ${options?.method || 'GET'} ${url}`);
      if (bearer) {
        console.log(`API Call: Authorization header attached (${bearer.substring(0, 20)}...)`);
      }
      
      const response = await fetch(url, config);
      const data = await response.json();

      console.log(`API Call Response: ${response.status} ${response.statusText}`, data);

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  // Auth Actions
  const login = async (nurseId: string, password: string) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nurseId, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const { nurse, token, refreshToken } = data.data;
      
      saveAuthData(token, refreshToken, nurse);
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { nurse, token, refreshToken }
      });

      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: message
      });
      throw error;
    }
  };

  const signup = async (nurseId: string, password: string, confirmPassword: string) => {
    dispatch({ type: AUTH_ACTIONS.SIGNUP_START });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nurseId, password, confirmPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      const { nurse, token, refreshToken } = data.data;
      
      saveAuthData(token, refreshToken, nurse);
      
      dispatch({
        type: AUTH_ACTIONS.SIGNUP_SUCCESS,
        payload: { nurse, token, refreshToken }
      });

      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      dispatch({
        type: AUTH_ACTIONS.SIGNUP_FAILURE,
        payload: message
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (state.refreshToken) {
        await apiCall('/auth/logout', {
          method: 'POST',
          body: { refreshToken: state.refreshToken }
        });
      }
    } catch (error: unknown) {
      console.error('Logout API call failed:', error);
    } finally {
      clearAuthData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  const refreshAuthToken = async () => {
    try {
      if (!state.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: state.refreshToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Token refresh failed');
      }

      const { token, refreshToken } = data.data;
      
      saveAuthData(token, refreshToken, state.user);
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { nurse: state.user, token, refreshToken }
      });

      return { token, refreshToken };
    } catch (error: unknown) {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      clearAuthData();
      throw error;
    }
  };

  const updateProfile = async (updates: Record<string, unknown>) => {
    try {
      const data = await apiCall('/auth/profile', {
        method: 'PATCH',
        body: updates
      });

      dispatch({
        type: AUTH_ACTIONS.UPDATE_PROFILE,
        payload: data.data.nurse
      });

      // Update localStorage
      const updatedUser = { ...state.user, ...data.data.nurse };
      localStorage.setItem('userData', JSON.stringify(updatedUser));

      return data;
    } catch (error: unknown) {
      throw error;
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    try {
      const data = await apiCall('/auth/change-password', {
        method: 'PATCH',
        body: { currentPassword, newPassword, confirmPassword }
      });

      return data;
    } catch (error: unknown) {
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    login,
    signup,
    logout,
    refreshAuthToken,
    updateProfile,
    changePassword,
    clearError,
    apiCall
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
