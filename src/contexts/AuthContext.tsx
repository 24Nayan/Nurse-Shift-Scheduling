import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Define the type for the AuthContext state and dispatch.
// (You may further refine these types as your state/actions interface evolves.)
interface AuthState {
  user: any;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { nurse: any; token: string; refreshToken: string } }
  | { type: 'LOGIN_FAILURE'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'SIGNUP_START' }
  | { type: 'SIGNUP_SUCCESS'; payload: { nurse: any; token: string; refreshToken: string } }
  | { type: 'SIGNUP_FAILURE'; payload: { error: string } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_PROFILE'; payload: { nurse: any } };

// The context will provide an object with state, dispatch, and possibly helper functions in the future.
interface AuthContextType {
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
}

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
const authReducer = (state:any, action:any) => {
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
const API_BASE_URL = 'http://localhost:5000/api';

// Auth Provider Component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userData', JSON.stringify(user));
  };

  // Clear auth data from localStorage
  const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  };

  // API call helper with auth headers
  type ApiHeaders = Record<string, string>;
  type ApiOptions = {
    headers?: ApiHeaders;
    method?: string;
    body?: any;
    credentials?: RequestCredentials;
    signal?: AbortSignal | null;
  };

  const apiCall = async (endpoint: string, options: ApiOptions = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: ApiHeaders = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }

    const config: RequestInit = {
      method: options.method,
      headers,
      credentials: options.credentials,
      signal: options.signal
    };

    if (options.body !== undefined) {
      config.body = typeof options.body === 'object' ? JSON.stringify(options.body) : options.body;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

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
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: error instanceof Error ? error.message : 'Login failed'
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
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SIGNUP_FAILURE,
        payload: error instanceof Error ? error.message : 'Signup failed'
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
    } catch (error) {
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
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      clearAuthData();
      throw error;
    }
  };

  const updateProfile = async (updates: any) => {
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
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    try {
      const data = await apiCall('/auth/change-password', {
        method: 'PATCH',
        body: { currentPassword, newPassword, confirmPassword }
      });

      return data;
    } catch (error) {
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