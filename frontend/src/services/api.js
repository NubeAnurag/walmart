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

// Store API functions
export const storeAPI = {
  getStores: async () => {
    const response = await api.get('/stores');
    return response.data;
  },

  getStore: async (storeId) => {
    const response = await api.get(`/stores/${storeId}`);
    return response.data;
  },
};

// Supplier API functions
export const supplierAPI = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await api.get('/supplier/dashboard/stats');
    return response.data;
  },

  // Stores
  getStores: async () => {
    const response = await api.get('/supplier/stores');
    return response.data;
  },

  // Get supplier's products
  getSupplierProducts: async (supplierId) => {
    const response = await api.get(`/supplier/${supplierId}/products`);
    return response.data;
  },

  // Products
  getProducts: async (params = {}) => {
    const response = await api.get('/supplier/products', { params });
    return response.data;
  },

  addProduct: async (productData) => {
    const response = await api.post('/supplier/products', productData);
    return response.data;
  },

  updateProduct: async (productId, productData) => {
    const response = await api.put(`/supplier/products/${productId}`, productData);
    return response.data;
  },

  deleteProduct: async (productId) => {
    const response = await api.delete(`/supplier/products/${productId}`);
    return response.data;
  },

  // Orders
  getOrders: async (params = {}) => {
    const response = await api.get('/supplier/orders', { params });
    return response.data;
  },

  updateOrderStatus: async (orderId, status, notes = '') => {
    const response = await api.put(`/supplier/orders/${orderId}/status`, { status, notes });
    return response.data;
  },

  updateDeliveryTime: async (orderId, estimatedDeliveryTime) => {
    const response = await api.put(`/supplier/orders/${orderId}/delivery-time`, { estimatedDeliveryTime });
    return response.data;
  },
};

// Manager API functions
export const managerAPI = {
  // Suppliers
  getSuppliersByStore: async () => {
    console.log('🌐 Calling getSuppliersByStore API endpoint');
    try {
      const response = await api.get('/suppliers/by-store');
      console.log('📥 getSuppliersByStore raw response:', response);
      console.log('📥 getSuppliersByStore data structure:', JSON.stringify(response.data, null, 2));
      
      // Check if suppliers are available at the top level
      if (Array.isArray(response.data?.suppliers)) {
        console.log(`📊 Found ${response.data.suppliers.length} suppliers at top level`);
      } else if (Array.isArray(response.data?.data?.suppliers)) {
        console.log(`📊 Found ${response.data.data.suppliers.length} suppliers in data.suppliers`);
      } else {
        console.log('⚠️ Could not find suppliers array in expected locations');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ getSuppliersByStore error:', error);
      console.error('❌ Error details:', error.response?.data);
      throw error;
    }
  },

  getSupplierProducts: async (supplierId, params = {}) => {
    try {
      const response = await api.get(`/suppliers/${supplierId}/products`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      throw error;
    }
  },

  // Analytics
  getDashboardStats: async () => {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  },

  // Staff
  getStaff: async () => {
    const response = await api.get('/staff');
    return response.data;
  },

  // Inventory
  getInventory: async () => {
    const response = await api.get('/inventory');
    return response.data;
  },

  // Reports
  getReports: async () => {
    const response = await api.get('/reports');
    return response.data;
  },

  // Orders
  placeOrder: async (orderData) => {
    const response = await api.post('/suppliers/orders', orderData);
    return response.data;
  },
};

// Admin API functions
export const adminAPI = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },

  // Employee management
  createEmployee: async (employeeData) => {
    const response = await api.post('/admin/employees', employeeData);
    return response.data;
  },

  getEmployees: async (params = {}) => {
    const response = await api.get('/admin/employees', { params });
    return response.data;
  },

  getEmployeesByStore: async () => {
    const response = await api.get('/admin/employees/by-store');
    return response.data;
  },

  getEmployee: async (employeeId) => {
    const response = await api.get(`/admin/employees/${employeeId}`);
    return response.data;
  },

  updateEmployee: async (employeeId, employeeData) => {
    const response = await api.put(`/admin/employees/${employeeId}`, employeeData);
    return response.data;
  },

  deleteEmployee: async (employeeId) => {
    const response = await api.delete(`/admin/employees/${employeeId}`);
    return response.data;
  },

  resetEmployeePassword: async (employeeId, newPassword = null) => {
    const response = await api.post(`/admin/employees/${employeeId}/reset-password`, 
      newPassword ? { password: newPassword } : {});
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