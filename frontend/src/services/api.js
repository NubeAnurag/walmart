import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://walmart-pdji.onrender.com/api', // <-- Updated for production
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log the API base URL for debugging
console.log('🔗 API Base URL configured as:', api.defaults.baseURL);
console.log('🔗 Environment API URL:', process.env.REACT_APP_API_URL);

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

  // Manager Orders (for supplier dashboard)
  getManagerOrders: async (params = {}) => {
    const response = await api.get('/manager-orders/supplier/orders', { params });
    return response.data;
  },

  updateManagerOrderStatus: async (orderId, requestData) => {
    const response = await api.patch(`/manager-orders/orders/${orderId}/status`, requestData);
    return response.data;
  },

  getManagerOrderDetails: async (orderId) => {
    const response = await api.get(`/manager-orders/orders/${orderId}`);
    return response.data;
  },
};

// Customer API functions
export const customerAPI = {
  // Stores
  getStores: async () => {
    const response = await api.get('/customer/stores');
    return response.data;
  },

  // Products
  getStoreProducts: async (storeId, params = {}) => {
    const response = await api.get(`/customer/stores/${storeId}/products`, { params });
    return response.data;
  },

  getProductDetails: async (productId, storeId) => {
    const response = await api.get(`/customer/products/${productId}`, { 
      params: { storeId } 
    });
    return response.data;
  },

  // Orders
  createOrder: async (orderData) => {
    const response = await api.post('/customer/orders', orderData);
    return response.data;
  },

  getOrders: async () => {
    const response = await api.get('/customer/orders');
    return response.data;
  },

  // Receipts
  downloadReceipt: async (saleId, format = 'pdf') => {
    const response = await api.get(`/customer/receipt/${saleId}`, {
      params: { format },
      responseType: 'blob'
    });
    return response;
  },

  // Inventory
  getStoreInventory: async (storeId) => {
    const response = await api.get(`/customer/inventory/${storeId}`);
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
      console.log('🔍 Fetching products for supplier:', supplierId);
      // Use the correct endpoint from the supplier routes
      const response = await api.get(`/suppliers/${supplierId}/products`, { params });
      console.log('📦 Supplier products response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching supplier products:', error);
      console.error('❌ Error details:', error.response?.data);
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
    console.log('🌐 Calling getStaff API endpoint: /staff');
    try {
      const response = await api.get('/staff');
      console.log('📥 getStaff raw response:', response);
      console.log('📥 getStaff response data:', response.data);
      console.log('📥 getStaff response status:', response.status);
      return response.data;
    } catch (error) {
      console.error('❌ getStaff API error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
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

  // Manager Orders
  getCatalogProducts: async (params = {}) => {
    const response = await api.get('/manager-orders/products', { params });
    return response.data;
  },

  createOrder: async (orderData) => {
    const response = await api.post('/manager-orders/orders', orderData);
    return response.data;
  },

  getOrders: async (params = {}) => {
    const response = await api.get('/manager-orders/orders', { params });
    return response.data;
  },

  getOrderDetails: async (orderId) => {
    const response = await api.get(`/manager-orders/orders/${orderId}`);
    return response.data;
  },

  acceptDelivery: async (orderId, deliveryData) => {
    const response = await api.post(`/manager-orders/orders/${orderId}/delivery`, deliveryData);
    return response.data;
  },

  // Get supplier performance metrics
  getSupplierPerformanceMetrics: async (params = {}) => {
    try {
      console.log('🔍 Fetching supplier performance metrics with params:', params);
      const response = await api.get('/analytics/supplier-performance', { params });
      console.log('📊 Supplier performance metrics response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching supplier performance metrics:', error);
      console.error('❌ Error details:', error.response?.data);
      throw error;
    }
  },

  // Inventory Management
  getInventoryProducts: async (params = {}) => {
    try {
      console.log('📦 Fetching inventory products with params:', params);
      console.log('📦 API base URL:', api.defaults.baseURL);
      console.log('📦 Full URL will be:', api.defaults.baseURL + '/inventory/products');
      const response = await api.get('/inventory/products', { params });
      console.log('📦 Inventory products response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching inventory products:', error);
      console.error('❌ Error response status:', error.response?.status);
      console.error('❌ Error details:', error.response?.data);
      throw error;
    }
  },

  getInventoryProduct: async (productId) => {
    try {
      const response = await api.get(`/inventory/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching inventory product:', error);
      throw error;
    }
  },

  updateStock: async (productId, stockData) => {
    try {
      console.log('📦 Updating stock for product:', productId, stockData);
      const response = await api.post(`/inventory/products/${productId}/stock`, stockData);
      console.log('📦 Stock update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating stock:', error);
      console.error('❌ Error details:', error.response?.data);
      throw error;
    }
  },

  getStockAlerts: async (params = {}) => {
    try {
      const response = await api.get('/inventory/alerts', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching stock alerts:', error);
      throw error;
    }
  },

  // Attendance Management

  // AI Optimization
  getAIInsights: async (storeId) => {
    try {
      console.log('🧠 Fetching AI insights for store:', storeId);
      const response = await api.get(`/ai-optimization/insights/${storeId}`);
      console.log('🧠 AI insights response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching AI insights:', error);
      throw error;
    }
  },

  runAIAnalysis: async (storeId) => {
    try {
      console.log('🧠 Running AI analysis for store:', storeId);
      const response = await api.post(`/ai-optimization/analyze/${storeId}`);
      console.log('🧠 AI analysis response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error running AI analysis:', error);
      throw error;
    }
  },

  applyAIRecommendation: async (recommendationId, action, quantity) => {
    try {
      console.log('🧠 Applying AI recommendation:', recommendationId);
      const response = await api.post(`/ai-optimization/recommendations/${recommendationId}/apply`, {
        action,
        quantity
      });
      console.log('🧠 Apply recommendation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error applying AI recommendation:', error);
      throw error;
    }
  },

  getAIModelPerformance: async (storeId) => {
    try {
      console.log('🧠 Fetching AI model performance for store:', storeId);
      const response = await api.get(`/ai-optimization/performance/${storeId}`);
      console.log('🧠 AI model performance response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching AI model performance:', error);
      throw error;
    }
  },

  // Product Analytics
  getProductPerformance: async (storeId, timeframe = '30') => {
    try {
      console.log('📊 Fetching product performance for store:', storeId);
      const response = await api.get(`/product-analytics/performance/${storeId}`, {
        params: { timeframe }
      });
      console.log('📊 Product performance response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching product performance:', error);
      throw error;
    }
  },

  getProfitabilityInsights: async (storeId) => {
    try {
      console.log('💰 Fetching profitability insights for store:', storeId);
      const response = await api.get(`/product-analytics/profitability/${storeId}`);
      console.log('💰 Profitability insights response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching profitability insights:', error);
      throw error;
    }
  },

  applyProductRecommendation: async (productId, action, quantity, reason) => {
    try {
      console.log('📊 Applying product recommendation:', productId);
      const response = await api.post(`/product-analytics/recommendations/${productId}/apply`, {
        action,
        quantity,
        reason
      });
      console.log('📊 Apply recommendation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error applying product recommendation:', error);
      throw error;
    }
  },
  getStaffAttendance: async (staffId, year, month) => {
    try {
      console.log('📅 Fetching staff attendance:', { staffId, year, month });
      const response = await api.get(`/attendance/staff/${staffId}`, {
        params: { year, month }
      });
      console.log('📅 Staff attendance response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching staff attendance:', error);
      throw error;
    }
  },

  markAttendance: async (staffId, attendanceData) => {
    try {
      console.log('📅 Marking attendance for staff:', staffId, attendanceData);
      const response = await api.post('/attendance/mark', {
        staffId,
        ...attendanceData
      });
      console.log('📅 Mark attendance response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error marking attendance:', error);
      throw error;
    }
  },

  getStoreAttendanceSummary: async (date) => {
    try {
      console.log('📅 Fetching store attendance summary for date:', date);
      const response = await api.get('/attendance/store/summary', {
        params: { date }
      });
      console.log('📅 Store attendance summary response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching store attendance summary:', error);
      throw error;
    }
  },

  getStaffAttendanceStats: async (staffId, year, month) => {
    try {
      console.log('📅 Fetching staff attendance stats:', { staffId, year, month });
      const response = await api.get(`/attendance/staff/${staffId}/stats`, {
        params: { year, month }
      });
      console.log('📅 Staff attendance stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching staff attendance stats:', error);
      throw error;
    }
  },

  getStaffPerformanceInsights: async (staffId) => {
    try {
      console.log('🎯 Fetching staff performance insights for ID:', staffId);
      console.log('🎯 API URL:', `/attendance/staff/${staffId}/insights`);
      console.log('🎯 Full URL:', api.defaults.baseURL + `/attendance/staff/${staffId}/insights`);
      
      const response = await api.get(`/attendance/staff/${staffId}/insights`);
      console.log('🎯 Staff performance insights response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching staff performance insights:', error);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  },

  updateStaffPerformance: async (staffId) => {
    try {
      console.log('🎯 Updating staff performance rating:', staffId);
      const response = await api.post(`/attendance/staff/${staffId}/performance`);
      console.log('🎯 Staff performance update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating staff performance:', error);
      throw error;
    }
  },

  getInventoryAnalytics: async () => {
    try {
      const response = await api.get('/inventory/analytics');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching inventory analytics:', error);
      throw error;
    }
  },

  debugCheckOrders: async () => {
    try {
      console.log('🔍 Calling debug check orders API...');
      const response = await api.get('/inventory/debug/check-orders');
      console.log('🔍 Debug check orders response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error in debug check orders:', error);
      throw error;
    }
  },

  debugFixOrders: async () => {
    try {
      console.log('🔧 Calling debug fix orders API...');
      const response = await api.post('/inventory/debug/fix-orders');
      console.log('🔧 Debug fix orders response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error in debug fix orders:', error);
      throw error;
    }
  },
};

// Staff API functions (for staff to view their own data)
export const staffAPI = {
  // Get my attendance data
  getMyAttendance: async (year, month) => {
    try {
      console.log('🎯 staffAPI.getMyAttendance: Starting request for year:', year, 'month:', month);
      const params = {};
      if (year) params.year = year;
      if (month) params.month = month;
      
      console.log('🎯 staffAPI.getMyAttendance: Making request to /attendance/my-attendance with params:', params);
      const response = await api.get('/attendance/my-attendance', { params });
      console.log('🎯 staffAPI.getMyAttendance: Received response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ staffAPI.getMyAttendance: Error fetching my attendance:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  },

  // Get my performance insights
  getMyPerformanceInsights: async () => {
    try {
      console.log('🎯 staffAPI.getMyPerformanceInsights: Starting request');
      console.log('🎯 staffAPI.getMyPerformanceInsights: Making request to /attendance/my-performance');
      const response = await api.get('/attendance/my-performance');
      console.log('🎯 staffAPI.getMyPerformanceInsights: Received response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ staffAPI.getMyPerformanceInsights: Error fetching my performance insights:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  },

  // Debug method to check current user
  debugWhoAmI: async () => {
    try {
      console.log('🔍 Checking current user...');
      const response = await api.get('/attendance/debug/whoami');
      console.log('🔍 Current user:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error checking current user:', error);
      throw error;
    }
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
    const response = await axios.get('https://walmart-pdji.onrender.com/health'); // Updated for production
    return response.data;
  },

  testDatabase: async () => {
    const response = await api.get('/test-db');
    return response.data;
  },
};

// Error handling utility
// Inventory API functions
export const inventoryAPI = {
  getStoreInventory: async (storeId) => {
    const response = await api.get(`/inventory/store/${storeId}`);
    return response.data;
  },

  getProducts: async (params) => {
    const response = await api.get('/inventory/products', { params });
    return response.data;
  },

  getProduct: async (productId) => {
    const response = await api.get(`/inventory/products/${productId}`);
    return response.data;
  },

  updateStock: async (productId, stockData) => {
    const response = await api.post(`/inventory/products/${productId}/stock`, stockData);
    return response.data;
  },
};

// Sales API functions
export const salesAPI = {
  processSale: async (saleData) => {
    try {
      console.log('💰 Making process sale API call to:', api.defaults.baseURL + '/sales');
      console.log('📤 Original sale data:', saleData);
      
      // Transform the data to match backend expectations
      const transformedData = {
        customerName: `${saleData.customerInfo.firstName} ${saleData.customerInfo.lastName}`.trim(),
        customerEmail: saleData.customerInfo.email || '',
        customerPhone: saleData.customerInfo.phone || '',
        items: saleData.cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: saleData.totalAmount,
        storeId: saleData.storeId,
        cashierId: saleData.staffId
      };
      
      console.log('📤 Transformed sale data:', transformedData);
      const response = await api.post('/sales', transformedData);
      console.log('📥 Process sale API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('🚨 Process sale API error:', error);
      throw error;
    }
  },
  createSale: async (saleData) => {
    const response = await api.post('/sales', saleData);
    return response.data;
  },

  getStoreSales: async (storeId, params) => {
    const response = await api.get(`/sales/store/${storeId}`, { params });
    return response.data;
  },

  getSale: async (saleId) => {
    const response = await api.get(`/sales/${saleId}`);
    return response.data;
  },

  getSalesAnalytics: async (storeId, params) => {
    const response = await api.get(`/sales/store/${storeId}/analytics`, { params });
    return response.data;
  },

  downloadReceipt: async (saleId, format = 'pdf') => {
    try {
      console.log('🌐 Downloading receipt for sale ID:', saleId, 'in format:', format);
      
      // Set appropriate headers based on format
      let acceptHeader;
      switch (format) {
        case 'pdf':
          acceptHeader = 'application/pdf';
          break;
        case 'jpeg':
        case 'jpg':
          acceptHeader = 'image/jpeg';
          break;
        case 'png':
          acceptHeader = 'image/png';
          break;
        default:
          acceptHeader = 'application/pdf';
      }
      
      const response = await api.get(`/sales/${saleId}/receipt`, {
        params: { format }, // Send format as query parameter
        responseType: 'blob', // Important for binary download
        headers: {
          'Accept': acceptHeader
        }
      });
      console.log('📥 Receipt API response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        format: format
      });
      return response;
    } catch (error) {
      console.error('❌ Receipt API error:', error);
      throw error;
    }
  },
};

// Chatbot API
export const chatbotAPI = {
  // Send message to chatbot
  sendMessage: async (message, sessionId) => {
    try {
      console.log('🤖 Sending message to chatbot:', { message, sessionId });
      const response = await api.post('/chatbot/message', { message, sessionId });
      console.log('📥 Chatbot response received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Chatbot sendMessage error:', error);
      throw error;
    }
  },
  
  // Get chat history for a session
  getChatHistory: async (sessionId, limit = 50) => {
    try {
      console.log('📜 Getting chat history for session:', sessionId);
      const response = await api.get(`/chatbot/history/${sessionId}?limit=${limit}`);
      console.log('📥 Chat history received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Chatbot getChatHistory error:', error);
      throw error;
    }
  },
  
  // Get all chat sessions
  getChatSessions: async (limit = 10) => {
    try {
      console.log('📋 Getting chat sessions');
      const response = await api.get(`/chatbot/sessions?limit=${limit}`);
      console.log('📥 Chat sessions received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Chatbot getChatSessions error:', error);
      throw error;
    }
  },
  
  // Create new chat session
  createSession: async () => {
    try {
      console.log('🆕 Creating new chat session');
      const response = await api.post('/chatbot/session');
      console.log('📥 New session created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Chatbot createSession error:', error);
      throw error;
    }
  },
  
  // Rate a bot message
  rateMessage: async (messageId, rating, helpful) => {
    try {
      console.log('⭐ Rating message:', { messageId, rating, helpful });
      const response = await api.post(`/chatbot/rate/${messageId}`, { rating, helpful });
      console.log('📥 Rating response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Chatbot rateMessage error:', error);
      throw error;
    }
  },
  
  // Get product recommendations
  getProductRecommendations: async (preferences = {}) => {
    try {
      console.log('🛍️ Getting product recommendations:', preferences);
      const response = await api.post('/chatbot/recommendations', { preferences });
      console.log('📥 Product recommendations received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Chatbot getProductRecommendations error:', error);
      throw error;
    }
  },
  
  // Get chat analytics
  getChatAnalytics: async (days = 30) => {
    try {
      console.log('📊 Getting chat analytics for', days, 'days');
      const response = await api.get(`/chatbot/analytics?days=${days}`);
      console.log('📥 Chat analytics received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Chatbot getChatAnalytics error:', error);
      throw error;
    }
  }
};

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