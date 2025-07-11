import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  register: async (userData) => {
    console.log('🌐 Making registration API call to:', api.defaults.baseURL + '/auth/register');
    console.log('📤 Registration data:', userData);
    try {
      const response = await api.post('/auth/register', userData);
      console.log('📥 Registration API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('🚨 Registration API error:', error);
      throw error;
    }
  },

  login: async (credentials) => {
    console.log('🌐 Making login API call to:', api.defaults.baseURL + '/auth/login');
    console.log('📤 Login data:', credentials);
    try {
      const response = await api.post('/auth/login', credentials);
      console.log('📥 Login API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('🚨 Login API error:', error);
      throw error;
    }
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },
};

// General API functions
export const generalAPI = {
  healthCheck: async () => {
    const response = await axios.get('http://localhost:5001/health');
    return response.data;
  },

  testDatabase: async () => {
    const response = await api.get('/test-db');
    return response.data;
  },
};

// Error handling utility
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || 'An error occurred';
    const errors = error.response.data?.errors || [];
    return { message, errors, status: error.response.status };
  } else if (error.request) {
    // Network error
    return { 
      message: 'Network error. Please check your connection.', 
      errors: [], 
      status: 0 
    };
  } else {
    // Other error
    return { 
      message: error.message || 'An unexpected error occurred', 
      errors: [], 
      status: 0 
    };
  }
};

export default api; 