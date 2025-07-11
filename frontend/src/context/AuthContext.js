import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI, handleAPIError } from '../services/api';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');

      console.log('AuthContext: Checking auth status - token:', !!token, 'user:', !!user);

      if (token && user) {
        // Verify token with server to get fresh user data with populated fields
        console.log('AuthContext: Verifying token with server');
        const response = await authAPI.verifyToken();
        console.log('AuthContext: Token verification response:', response);
        
        if (response.success) {
          console.log('AuthContext: Token valid, updating user data');
          // Update localStorage with fresh user data (includes populated storeId)
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: { user: response.data.user },
          });
        } else {
          // Token invalid, clear storage
          console.log('AuthContext: Token invalid, clearing storage');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } else {
        console.log('AuthContext: No token or user found, setting loading to false');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    } catch (error) {
      console.error('AuthContext: Auth check failed:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      console.log('🔐 Attempting login with:', {
        email: credentials.email,
        role: credentials.role,
        hasPassword: !!credentials.password
      });
      
      const response = await authAPI.login(credentials);
      console.log('✅ Login response:', response);
      
      if (response.success) {
        // Store token and user data
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user: response.data.user },
        });

        toast.success('Login successful!');
        console.log('Login successful, user:', response.data.user);
        return { success: true, user: response.data.user };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorInfo = handleAPIError(error);
      
      // Enhanced error messages for better debugging
      let displayMessage = errorInfo.message;
      if (errorInfo.message.includes('registered as a')) {
        displayMessage = `Wrong role selected! ${errorInfo.message}`;
      } else if (errorInfo.message.includes('Invalid email or password')) {
        displayMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (errorInfo.message.includes('Network error')) {
        displayMessage = 'Connection failed. Please check if the backend server is running.';
      }
      
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: displayMessage,
      });
      toast.error(displayMessage);
      return { success: false, error: displayMessage };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      console.log('📝 Registration attempt:', {
        email: userData.email,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
        hasPassword: !!userData.password
      });

      const response = await authAPI.register(userData);
      console.log('✅ Registration response:', response);
      
      if (response.success) {
        // Store token and user data
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        console.log('💾 Stored token and user data:', {
          token: response.data.token.substring(0, 20) + '...',
          user: response.data.user
        });
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user: response.data.user },
        });

        toast.success('Registration successful!');
        return { success: true, user: response.data.user };
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      const errorInfo = handleAPIError(error);
      
      // Enhanced error messages for registration
      let displayMessage = errorInfo.message;
      if (errorInfo.message.includes('User already exists')) {
        displayMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (errorInfo.message.includes('Network error')) {
        displayMessage = 'Connection failed. Please check if the backend server is running.';
      }
      
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: displayMessage,
      });
      toast.error(displayMessage);
      return { success: false, error: displayMessage, errors: errorInfo.errors };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear storage and state regardless of API call success
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const response = await authAPI.updateProfile(userData);
      
      if (response.success) {
        const updatedUser = response.data.user;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: updatedUser,
        });
        
        toast.success('Profile updated successfully!');
        return { success: true, user: updatedUser };
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: errorInfo.message,
      });
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 