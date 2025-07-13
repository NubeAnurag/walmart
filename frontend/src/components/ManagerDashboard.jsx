import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  Users, 
  Package, 
  Truck, 
  FileText, 
  Bell, 
  TrendingUp,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  UserCheck,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Plus,
  Search,
  Filter,
  RefreshCw,
  LogOut,
  Settings,
  Building2,
  Award,
  Warehouse
} from 'lucide-react';
import { managerAPI } from '../services/api';
import { format } from 'date-fns';

import ManagerOrders from './ManagerOrders';
import SupplierPerformanceMetrics from './SupplierPerformanceMetrics';
import InventoryManagement from './InventoryManagement';
import AttendanceCalendar from './AttendanceCalendar';
import PerformanceInsights from './PerformanceInsights';

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState({
    kpis: {},
    charts: {},
    alerts: [],
    recentActivities: []
  });
  const [staff, setStaff] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderItems, setOrderItems] = useState([]);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh suppliers when suppliers tab is selected
  useEffect(() => {
    if (activeTab === 'suppliers') {
      managerAPI.getSuppliersByStore().then(response => {
        console.log('🔄 Refreshing suppliers for tab change:', response);
        if (response?.suppliers) {
          setSuppliers(response.suppliers);
        }
      }).catch(error => {
        console.error('Error refreshing suppliers:', error);
      });
    }
  }, [activeTab]);

  // Refresh staff when staff tab is selected
  useEffect(() => {
    if (activeTab === 'staff') {
      console.log('🔄 Staff tab selected, refreshing staff data...');
      managerAPI.getStaff().then(response => {
        console.log('🔄 Refreshing staff for tab change:', response);
        console.log('🔄 Response type:', typeof response);
        console.log('🔄 Response keys:', Object.keys(response || {}));
        
        // Extract staff data from response
        let staffData = [];
        if (response?.success && response?.data?.staff) {
          console.log('📊 Found staff at response.data.staff');
          staffData = response.data.staff;
        } else if (Array.isArray(response?.data)) {
          console.log('📊 Found staff array directly in data');
          staffData = response.data;
        } else if (Array.isArray(response)) {
          console.log('📊 Found staff array directly');
          staffData = response;
        } else {
          console.log('❌ Could not find staff array in expected locations');
          console.log('❌ Response structure:', JSON.stringify(response, null, 2));
          staffData = [];
        }
        
        console.log('📊 Tab refresh staff data:', staffData);
        console.log('📊 Setting staff state with:', staffData.length, 'members');
        setStaff(staffData);
        console.log('📊 Staff state updated');
      }).catch(error => {
        console.error('❌ Error refreshing staff:', error);
        console.error('❌ Error details:', error.response?.data);
        console.error('❌ Full error:', error);
      });
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [
        analyticsRes,
        staffRes,
        suppliersRes,
        inventoryRes,
        reportsRes
      ] = await Promise.all([
        managerAPI.getDashboardStats(),
        managerAPI.getStaff(),
        managerAPI.getSuppliersByStore(),
        managerAPI.getInventory(),
        managerAPI.getReports()
      ]);

      // Enhanced debugging for suppliers response
      console.log('🔍 Full Suppliers API Response:', suppliersRes);
      
      // Try multiple paths to extract suppliers from the response
      let suppliersData = [];
      
      // Direct access - the backend returns suppliers at the top level
      if (Array.isArray(suppliersRes?.suppliers)) {
        console.log('📊 Found suppliers at suppliersRes.suppliers');
        suppliersData = suppliersRes.suppliers;
      } 
      // Nested in data object
      else if (Array.isArray(suppliersRes?.data?.suppliers)) {
        console.log('📊 Found suppliers at suppliersRes.data.suppliers');
        suppliersData = suppliersRes.data.suppliers;
      } 
      // Response might be the array itself
      else if (Array.isArray(suppliersRes)) {
        console.log('📊 Found suppliers array directly');
        suppliersData = suppliersRes;
      }
      // If we can't find suppliers array, log the structure of the response
      else {
        console.log('❌ Could not find suppliers array in expected locations');
        console.log('📊 Response structure:', JSON.stringify(suppliersRes, null, 2));
        
        // Try to extract suppliers from any array in the response
        const extractArrays = (obj) => {
          if (!obj) return null;
          for (const key in obj) {
            if (Array.isArray(obj[key]) && obj[key].length > 0) {
              console.log(`📊 Found potential array at ${key} with ${obj[key].length} items`);
              // Check if array items have properties typical of suppliers
              if (obj[key][0]?.companyName || obj[key][0]?.contactPerson) {
                console.log(`📊 Found suppliers array at ${key}`);
                return obj[key];
              }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              const result = extractArrays(obj[key]);
              if (result) return result;
            }
          }
          return null;
        };
        
        const extractedArray = extractArrays(suppliersRes);
        if (extractedArray) {
          console.log('📊 Using extracted suppliers array');
          suppliersData = extractedArray;
        } else {
          console.log('❌ Could not find any suitable array in the response');
          suppliersData = [];
        }
      }
      
      // Ensure suppliersData is always an array
      if (!Array.isArray(suppliersData)) {
        console.log('⚠️ Suppliers data is not an array, setting to empty array');
        suppliersData = [];
      }
      
      console.log('📊 Final Extracted Suppliers Array:', suppliersData);
      console.log('📊 Number of suppliers:', suppliersData.length);
      
      // Debug staff response structure
      console.log('🔍 Staff API Response:', staffRes);
      console.log('🔍 Staff data structure:', JSON.stringify(staffRes, null, 2));
      console.log('🔍 Type of staffRes:', typeof staffRes);
      console.log('🔍 Is staffRes an array?', Array.isArray(staffRes));
      console.log('🔍 staffRes.success:', staffRes?.success);
      console.log('🔍 staffRes.data:', staffRes?.data);
      console.log('🔍 staffRes.data.staff:', staffRes?.data?.staff);
      
      // Extract staff data from response
      let staffData = [];
      if (staffRes?.success && staffRes?.data?.staff) {
        console.log('📊 Found staff at staffRes.data.staff');
        staffData = staffRes.data.staff;
        console.log('📊 Staff data extracted from success path:', staffData);
      } else if (Array.isArray(staffRes?.data)) {
        console.log('📊 Found staff array directly in data');
        staffData = staffRes.data;
        console.log('📊 Staff data extracted from data array path:', staffData);
      } else if (Array.isArray(staffRes)) {
        console.log('📊 Found staff array directly');
        staffData = staffRes;
        console.log('📊 Staff data extracted from direct array path:', staffData);
      } else {
        console.log('❌ Could not find staff array in expected locations');
        console.log('📊 Staff response structure:', JSON.stringify(staffRes, null, 2));
        console.log('📊 All keys in staffRes:', Object.keys(staffRes || {}));
        staffData = [];
      }
      
      console.log('📊 Final Extracted Staff Array:', staffData);
      console.log('📊 Number of staff members:', staffData.length);
      console.log('📊 First staff member:', staffData[0]);
      
      // Validate staff data structure
      if (staffData.length > 0) {
        console.log('📊 Staff data validation:');
        staffData.forEach((member, index) => {
          console.log(`  Staff ${index + 1}:`, {
            id: member._id,
            fullName: member.fullName,
            user: member.user ? {
              firstName: member.user.firstName,
              lastName: member.user.lastName,
              email: member.user.email
            } : 'No user data',
            position: member.position,
            department: member.department,
            employeeId: member.employeeId
          });
        });
      }
      
      // Set state with the data
      setDashboardData(analyticsRes);
      setStaff(staffData);
      setSuppliers(suppliersData);
      setInventory(inventoryRes);
      setReports(reportsRes);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierProducts = async (supplierId) => {
    try {
      const response = await managerAPI.getSupplierProducts(supplierId);
      setSupplierProducts(response.data?.products || response.products || []);
      setSelectedSupplier(response.data?.supplier || response.supplier);
    } catch (error) {
      console.error('Error fetching supplier products:', error);
    }
  };

  const handleAddToOrder = (product) => {
    console.log('🎯 handleAddToOrder called with product:', product);
    
    // Ensure we have a valid product ID (use id or _id)
    const productId = (product.id || product._id || '').toString();
    
    if (!productId || productId === 'temp-1') {
      console.error('❌ Invalid product ID:', productId);
      alert('Invalid product. Please try again.');
      return;
    }
    
    console.log('🔍 Product details:', { 
      name: product.name, 
      id: productId, 
      price: product.price,
      stock: product.stock,
      image: product.image
    });
    
    // Check if product already exists in order
    const existingItemIndex = orderItems.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
      console.log('📦 Product already in order, updating quantity');
      const updatedItems = orderItems.map((item, index) => 
        index === existingItemIndex 
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      );
      setOrderItems(updatedItems);
      console.log('📦 Updated order items:', updatedItems.map(item => ({ name: item.name, id: item.productId, qty: item.quantity, total: item.totalPrice })));
    } else {
      console.log('📦 Adding new product to order');
      const newItem = {
        productId: productId,
        name: product.name,
        unitPrice: product.price,
        quantity: 1,
        totalPrice: product.price,
        image: product.image // Include image data
      };
      console.log('📦 New item to add:', { name: newItem.name, id: newItem.productId, price: newItem.unitPrice });
      
      // Use functional update to avoid stale state
      setOrderItems(prevItems => {
        const newOrderItems = [...prevItems, newItem];
        console.log('📦 New order items after adding:', newOrderItems.map(item => ({ name: item.name, id: item.productId, qty: item.quantity, total: item.totalPrice })));
        return newOrderItems;
      });
    }
  };

  const handlePlaceOrder = async () => {
    try {
      // Validate order items
      if (!orderItems || orderItems.length === 0) {
        alert('Please add items to your order');
        return;
      }
      
      if (!selectedSupplier || !selectedSupplier._id) {
        alert('Please select a supplier');
        return;
      }

      // Create order data - use the supplier's user ID from the userId field
      const orderData = {
        supplierId: selectedSupplier.userId?._id || selectedSupplier.userId, // Use the supplier's user ID
        items: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        notes: 'Order placed by manager'
      };

      console.log('🛒 Placing order:', orderData);
      console.log('🛒 Selected supplier:', selectedSupplier);
      console.log('🛒 Order items:', orderItems);

      // Use the correct manager API endpoint
      const response = await managerAPI.createOrder(orderData);
      
      if (response.success) {
        // Clear the order
        setOrderItems([]);
        setShowOrderModal(false);
        
        // Show success message
        alert(`Order placed successfully! Order Number: ${response.data.orderNumber}`);
        
        // Refresh the suppliers to update any state
        await fetchDashboardData();
      } else {
        throw new Error(response.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order: ' + (error.response?.data?.message || error.message));
    }
  };

  // Navigation tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'supplier-performance', label: 'Supplier Performance', icon: Award },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'inventory', label: 'Inventory', icon: Warehouse }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-walmart-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Manager Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {user.firstName} {user.lastName}! 📊
                </p>
              </div>
              {/* Debug: Log user context */}
              {console.log('ManagerDashboard user:', user)}
              
              {/* Manager's Store Information */}
              {user.storeId ? (
                <div className="bg-gradient-to-r from-walmart-blue to-blue-600 text-white px-4 py-3 rounded-lg shadow-md">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white bg-opacity-20 rounded-full p-2">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium opacity-90">Managing Store</div>
                      <div className="font-bold text-lg">
                        {user.storeId.name || 'Store Name Not Found'}
                      </div>
                      <div className="text-sm opacity-80">
                        Store Code: {user.storeId.storeCode || 'Code Not Found'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <div>
                      <div className="font-medium">No Store Assigned</div>
                      <div className="text-sm">Contact administrator to assign a store</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <Bell className="w-6 h-6" />
                </button>
              </div>
              
              {/* Refresh */}
              <button 
                onClick={fetchDashboardData}
                className="p-2 text-gray-400 hover:text-gray-500"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
              
              {/* Logout */}
              <button 
                onClick={logout}
                className="btn btn-secondary"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-walmart-blue text-walmart-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab data={dashboardData} />}
        {activeTab === 'orders' && <ManagerOrders />}
        {activeTab === 'staff' && <StaffTab staff={staff} setStaff={setStaff} />}
        {activeTab === 'suppliers' && (
          <SuppliersTab 
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            fetchSupplierProducts={fetchSupplierProducts}
            selectedSupplier={selectedSupplier}
            setSelectedSupplier={setSelectedSupplier}
            supplierProducts={supplierProducts}
            setSupplierProducts={setSupplierProducts}
            handleAddToOrder={handleAddToOrder}
            orderItems={orderItems}
            setOrderItems={setOrderItems}
            setShowOrderModal={setShowOrderModal}
            showOrderModal={showOrderModal}
            handlePlaceOrder={handlePlaceOrder}
          />
        )}
        {activeTab === 'supplier-performance' && <SupplierPerformanceMetrics />}
        {activeTab === 'alerts' && <AlertsTab alerts={dashboardData?.alerts} />}
        {activeTab === 'inventory' && <InventoryManagement />}
        {activeTab === 'reports' && <ReportsTab reports={reports} setReports={setReports} />}
        {activeTab === 'analytics' && <AnalyticsTab data={dashboardData} />}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ data }) => {
  const { kpis, alerts, recentActivities } = data;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${kpis?.totalSales?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">
            +{kpis?.salesGrowth || 0}% from last month
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpis?.totalOrders?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            +{kpis?.orderGrowth || 0}% from last month
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Staff</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpis?.activeStaff || '0'}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-2">
            {kpis?.staffAttendance || 0}% attendance rate
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpis?.lowStockCount || '0'}
              </p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-red-600 mt-2">
            Requires immediate attention
          </p>
        </div>
      </div>

      {/* Simple Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Sales Overview</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Sales Chart</p>
              <p className="text-sm text-gray-400">Chart visualization coming soon</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Category Chart</p>
              <p className="text-sm text-gray-400">Chart visualization coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">System Alerts</h3>
          <div className="space-y-3">
            {alerts?.length > 0 ? (
              alerts.map((alert, index) => (
                <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 ${
                  alert.type === 'error' ? 'border-red-400 bg-red-50' :
                  alert.type === 'warning' ? 'border-yellow-400 bg-yellow-50' :
                  'border-blue-400 bg-blue-50'
                }`}>
                  <div className="flex-shrink-0">
                    {alert.type === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                    {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                    {alert.type === 'info' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-500">No alerts at this time</p>
                <p className="text-sm text-gray-400">Your system is running smoothly</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
          <div className="space-y-3">
            {recentActivities?.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activities</p>
                <p className="text-sm text-gray-400">Activity will appear here as it happens</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Staff Tab Component
const StaffTab = ({ staff, setStaff }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAttendanceCalendar, setShowAttendanceCalendar] = useState(false);
  const [attendanceStaffId, setAttendanceStaffId] = useState(null);
  const [showPerformanceInsights, setShowPerformanceInsights] = useState(false);
  const [performanceStaffId, setPerformanceStaffId] = useState(null);
  const [performanceStaffName, setPerformanceStaffName] = useState('');

  // Debug staff prop
  console.log('🔍 StaffTab received staff prop:', staff);
  console.log('🔍 StaffTab staff type:', typeof staff);
  console.log('🔍 StaffTab staff is array:', Array.isArray(staff));
  console.log('🔍 StaffTab staff length:', staff?.length);
  console.log('🔍 StaffTab first staff member:', staff?.[0]);

  // Get unique departments and positions for filters
  const departments = [...new Set(staff.map(member => member.department).filter(Boolean))];
  const positions = [...new Set(staff.map(member => member.position).filter(Boolean))];

  console.log('🔍 StaffTab departments:', departments);
  console.log('🔍 StaffTab positions:', positions);

  const filteredStaff = staff.filter(member => {
    const matchesSearch = (
      member.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesDepartment = selectedDepartment === 'all' || member.department === selectedDepartment;
    const matchesPosition = selectedPosition === 'all' || member.position === selectedPosition;
    
    return matchesSearch && matchesDepartment && matchesPosition;
  });

  const handleViewStaff = (member) => {
    setSelectedStaff(member);
    setShowStaffModal(true);
  };

  const handleViewAttendance = (member) => {
    setAttendanceStaffId(member._id);
    setShowAttendanceCalendar(true);
  };

  const handleViewPerformance = (member) => {
    setPerformanceStaffId(member._id);
    setPerformanceStaffName(member.fullName || `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim());
    setShowPerformanceInsights(true);
  };

  const refreshStaffData = async () => {
    setLoading(true);
    try {
      const response = await managerAPI.getStaff();
      console.log('🔄 Staff refresh response:', response);
      
      // Extract staff data from response
      let staffData = [];
      if (response?.success && response?.data?.staff) {
        console.log('📊 Found staff at response.data.staff');
        staffData = response.data.staff;
      } else if (Array.isArray(response?.data)) {
        console.log('📊 Found staff array directly in data');
        staffData = response.data;
      } else if (Array.isArray(response)) {
        console.log('📊 Found staff array directly');
        staffData = response;
      } else {
        console.log('❌ Could not find staff array in expected locations');
        staffData = [];
      }
      
      console.log('📊 Refreshed staff data:', staffData);
      setStaff(staffData);
    } catch (error) {
      console.error('Error refreshing staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-100';
    if (rating >= 3.5) return 'text-blue-600 bg-blue-100';
    if (rating >= 2.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getAttendanceColor = (rate) => {
    if (rate >= 95) return 'text-green-600 bg-green-100';
    if (rate >= 85) return 'text-blue-600 bg-blue-100';
    if (rate >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
        <h2 className="text-xl font-semibold">Staff Management</h2>
          <p className="text-sm text-gray-600">
            Manage and monitor staff members in your store
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={refreshStaffData}
            disabled={loading}
            className="btn btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search staff by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-walmart-blue focus:border-walmart-blue"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-walmart-blue focus:border-walmart-blue"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-walmart-blue focus:border-walmart-blue"
            >
              <option value="all">All Positions</option>
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Staff Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
                  <div className="flex items-center">
            <Users className="w-8 h-8 text-walmart-blue" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{staff.length}</p>
                    </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
                      <div className="flex items-center">
            <Award className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Avg Performance</p>
              <p className="text-2xl font-bold text-gray-900">
                {staff.length > 0 ? (
                  (staff.reduce((sum, member) => sum + (member.performance?.rating || 0), 0) / staff.length).toFixed(1)
                ) : (
                  '0.0'
                )}
                        </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <UserCheck className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {staff.length > 0 ? (
                  Math.round(staff.reduce((sum, member) => sum + (member.attendanceRate || 0), 0) / staff.length)
                ) : (
                  '0'
                )}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Building2 className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {filteredStaff.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position & Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hourly Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Years of Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-walmart-blue to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {member.user?.firstName?.[0] || member.fullName?.[0] || 'N'}
                            {member.user?.lastName?.[0] || member.fullName?.split(' ')[1]?.[0] || 'A'}
                        </span>
                      </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.fullName || `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim()}
                    </div>
                          <div className="text-sm text-gray-500">
                            {member.employeeId} • {member.user?.email}
                  </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.position || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{member.department || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(member.performance?.rating || 0)}`}>
                          ★ {(member.performance?.rating || 0).toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAttendanceColor(member.attendanceRate || 0)}`}>
                        {Math.round(member.attendanceRate || 0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.hourlyRate ? formatCurrency(member.hourlyRate) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.yearsOfService || 0} years
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewStaff(member)}
                          className="text-walmart-blue hover:text-walmart-blue-dark"
                          title="View Details"
                        >
                      <Eye className="w-4 h-4" />
                    </button>
                        <button
                          onClick={() => handleViewAttendance(member)}
                          className="text-green-600 hover:text-green-800"
                          title="View Attendance"
                        >
                      <UserCheck className="w-4 h-4" />
                    </button>
                        <button
                          onClick={() => handleViewPerformance(member)}
                          className="text-purple-600 hover:text-purple-800"
                          title="View Performance Insights"
                        >
                      <Award className="w-4 h-4" />
                    </button>
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit Staff"
                        >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
                </div>
          ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-500 mb-2">No staff members found</p>
            <p className="text-sm text-gray-400">
              {searchTerm || selectedDepartment !== 'all' || selectedPosition !== 'all' 
                ? 'Try adjusting your search criteria or filters'
                : 'No staff members are currently assigned to your store'
              }
            </p>
          </div>
          )}
      </div>

      {/* Staff Detail Modal */}
      {showStaffModal && selectedStaff && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Staff Details - {selectedStaff.fullName || `${selectedStaff.user?.firstName || ''} ${selectedStaff.user?.lastName || ''}`.trim()}
              </h3>
              <button
                onClick={() => setShowStaffModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Full Name:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {selectedStaff.fullName || `${selectedStaff.user?.firstName || ''} ${selectedStaff.user?.lastName || ''}`.trim()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Employee ID:</span>
                    <span className="ml-2 text-sm text-gray-900">{selectedStaff.employeeId}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="ml-2 text-sm text-gray-900">{selectedStaff.user?.email}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="ml-2 text-sm text-gray-900">{selectedStaff.user?.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Hire Date:</span>
                    <span className="ml-2 text-sm text-gray-900">{formatDate(selectedStaff.hireDate)}</span>
                  </div>
                </div>
              </div>

              {/* Job Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Job Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Position:</span>
                    <span className="ml-2 text-sm text-gray-900">{selectedStaff.position}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Department:</span>
                    <span className="ml-2 text-sm text-gray-900">{selectedStaff.department}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Staff Type:</span>
                    <span className="ml-2 text-sm text-gray-900 capitalize">{selectedStaff.staffType}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Hourly Rate:</span>
                    <span className="ml-2 text-sm text-gray-900">{formatCurrency(selectedStaff.hourlyRate)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Years of Service:</span>
                    <span className="ml-2 text-sm text-gray-900">{selectedStaff.yearsOfService || 0} years</span>
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Performance</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Current Rating:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(selectedStaff.performance?.rating || 0)}`}>
                      ★ {(selectedStaff.performance?.rating || 0).toFixed(1)} / 5.0
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Last Review:</span>
                    <span className="ml-2 text-sm text-gray-900">{formatDate(selectedStaff.performance?.lastReview)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Next Review:</span>
                    <span className="ml-2 text-sm text-gray-900">{formatDate(selectedStaff.performance?.nextReview)}</span>
                  </div>
                  {selectedStaff.performance?.goals && selectedStaff.performance.goals.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-600">Goals:</span>
                      <div className="ml-2 text-sm text-gray-900">
                        {selectedStaff.performance.goals.map((goal, index) => (
                          <div key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-1 inline-block mr-1">
                            {goal}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Attendance</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Attendance Rate:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAttendanceColor(selectedStaff.attendanceRate || 0)}`}>
                      {Math.round(selectedStaff.attendanceRate || 0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Days Worked:</span>
                    <span className="ml-2 text-sm text-gray-900">{selectedStaff.attendance?.totalDaysWorked || 0}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Hours Worked:</span>
                    <span className="ml-2 text-sm text-gray-900">{Math.round(selectedStaff.attendance?.totalHoursWorked || 0)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Absences:</span>
                    <span className="ml-2 text-sm text-gray-900">{selectedStaff.attendance?.absences || 0}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Late Arrivals:</span>
                    <span className="ml-2 text-sm text-gray-900">{selectedStaff.attendance?.lateArrivals || 0}</span>
                  </div>
                </div>
              </div>

              {/* Skills & Emergency Contact */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedStaff.skills && selectedStaff.skills.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedStaff.skills.map((skill, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedStaff.emergencyContact && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Emergency Contact</h4>
                    <div className="space-y-1">
                      <div>
                        <span className="text-sm text-gray-600">Name:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedStaff.emergencyContact.name}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Relationship:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedStaff.emergencyContact.relationship}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Phone:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedStaff.emergencyContact.phone}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowStaffModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Calendar Modal */}
      {showAttendanceCalendar && attendanceStaffId && (
        <AttendanceCalendar
          staffId={attendanceStaffId}
          onClose={() => {
            setShowAttendanceCalendar(false);
            setAttendanceStaffId(null);
          }}
        />
      )}

      {/* Performance Insights Modal */}
      {showPerformanceInsights && performanceStaffId && (
        <PerformanceInsights
          staffId={performanceStaffId}
          staffName={performanceStaffName}
          onClose={() => {
            setShowPerformanceInsights(false);
            setPerformanceStaffId(null);
            setPerformanceStaffName('');
          }}
        />
      )}
    </div>
  );
};

// Inventory Tab Component  


// Suppliers Tab Component
const SuppliersTab = ({ 
  suppliers, 
  setSuppliers, 
  fetchSupplierProducts, 
  selectedSupplier, 
  setSelectedSupplier, 
  supplierProducts, 
  setSupplierProducts, 
  handleAddToOrder, 
  orderItems, 
  setOrderItems, 
  setShowOrderModal,
  showOrderModal,
  handlePlaceOrder 
}) => {
  // Enhanced debugging
  console.log('🔍 SuppliersTab received suppliers:', suppliers);
  console.log('🔍 SuppliersTab suppliers type:', typeof suppliers);
  console.log('🔍 SuppliersTab suppliers is array?', Array.isArray(suppliers));
  console.log('🔍 SuppliersTab suppliers length:', suppliers?.length);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('suppliers'); // 'suppliers' or 'products'
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [productFilters, setProductFilters] = useState({
    search: '',
    category: 'all',
    minPrice: '',
    maxPrice: '',
    inStock: 'all'
  });

  // Ensure suppliers is treated as an array even if it's not
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
  
  // Filter suppliers by search term
  const filteredSuppliers = safeSuppliers.filter(supplier =>
    supplier?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier?.contactPerson?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier?.contactPerson?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier?.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Debug: Suppliers count:', safeSuppliers.length);
  console.log('Debug: Filtered suppliers count:', filteredSuppliers.length);
  
  // Add more detailed debugging
  if (safeSuppliers.length > 0) {
    console.log('Debug: First supplier structure:', JSON.stringify(safeSuppliers[0], null, 2));
  }

  // Refresh suppliers data
  const refreshSuppliers = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await managerAPI.getSuppliersByStore();
      console.log('🔄 Refreshed suppliers response:', response);
      
      let refreshedSuppliers = [];
      
      // Try all possible locations for suppliers
      if (Array.isArray(response?.suppliers)) {
        refreshedSuppliers = response.suppliers;
      } else if (Array.isArray(response?.data?.suppliers)) {
        refreshedSuppliers = response.data.suppliers;
      } else if (Array.isArray(response)) {
        refreshedSuppliers = response;
      } else {
        // Try to extract suppliers from any array in the response
        const extractArrays = (obj) => {
          if (!obj) return null;
          for (const key in obj) {
            if (Array.isArray(obj[key]) && obj[key].length > 0) {
              // Check if array items have properties typical of suppliers
              if (obj[key][0]?.companyName || obj[key][0]?.contactPerson) {
                return obj[key];
              }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              const result = extractArrays(obj[key]);
              if (result) return result;
            }
          }
          return null;
        };
        
        const extractedArray = extractArrays(response);
        if (extractedArray) {
          refreshedSuppliers = extractedArray;
        }
      }
      
      if (Array.isArray(refreshedSuppliers) && refreshedSuppliers.length > 0) {
        console.log('✅ Successfully refreshed suppliers:', refreshedSuppliers.length);
        setSuppliers(refreshedSuppliers);
      } else {
        console.log('⚠️ Refresh returned no suppliers');
        setError('No suppliers found for your store after refresh');
      }
    } catch (err) {
      console.error('❌ Error refreshing suppliers:', err);
      setError('Failed to refresh suppliers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProducts = async (supplier) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Viewing products for supplier:', supplier._id, supplier.companyName);
      console.log('🛒 Current order items before viewing products:', orderItems.length);
      
      // Clear any existing order items when switching suppliers
      if (selectedSupplier && selectedSupplier._id !== supplier._id) {
        console.log('🧹 Clearing order items due to supplier change');
        setOrderItems([]);
      }
      
      // Store the selected supplier first so we can show supplier info during loading
      setSelectedSupplier(supplier);
      
      // Set view to products immediately to show loading state in products view
      setView('products');
      
      // Fetch supplier products
      const response = await managerAPI.getSupplierProducts(supplier._id);
      
      console.log('Products response:', response);
      
      if (!response || (!response.products && !response.data?.products)) {
        throw new Error('Invalid response format from API');
      }
      
      // Handle different response formats
      const productsData = response.products || response.data?.products || [];
      console.log('🔍 Products fetched from API:', productsData);
      
      // Clean and validate product data
      const cleanedProducts = productsData.map((product, index) => {
        console.log(`🔍 Product ${index + 1}:`, product.name, 'ID:', product._id, 'Price:', product.price);
        
        // Ensure consistent data format
        return {
          ...product,
          _id: product._id?.toString() || `temp-${index}`, // Ensure string ID
          price: Number(product.price) || 0, // Ensure numeric price
          name: product.name || `Unknown Product ${index + 1}`, // Ensure name exists
          stock: Number(product.stock) || 0 // Ensure numeric stock
        };
      });
      
      console.log('🔍 Cleaned products:', cleanedProducts.map(p => ({ name: p.name, id: p._id, price: p.price })));
      setSupplierProducts(cleanedProducts);
      
      // Reset product filters when viewing a new supplier's products
      setProductFilters({
        search: '',
        category: 'all',
        minPrice: '',
        maxPrice: '',
        inStock: 'all'
      });
      
    } catch (err) {
      console.error('Error fetching supplier products:', err);
      setError(`Failed to fetch products for ${supplier.companyName}: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSuppliers = () => {
    setView('suppliers');
  };

  const removeFromOrder = (productId) => {
    console.log('🗑️ Removing product from order:', productId);
    setOrderItems(prevItems => {
      const filteredItems = prevItems.filter(item => item.productId !== productId);
      console.log('🗑️ Items after removal:', filteredItems.map(item => ({ name: item.name, id: item.productId })));
      return filteredItems;
    });
  };

  const updateOrderQuantity = (productId, newQuantity) => {
    console.log('🔢 Updating quantity for product:', productId, 'to:', newQuantity);
    if (newQuantity <= 0) {
      removeFromOrder(productId);
    } else {
      setOrderItems(prevItems => {
        const updatedItems = prevItems.map(item => 
          item.productId === productId 
            ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
            : item
        );
        console.log('🔢 Items after quantity update:', updatedItems.map(item => ({ name: item.name, id: item.productId, qty: item.quantity, total: item.totalPrice })));
        return updatedItems;
      });
    }
  };

  const getTotalOrderValue = () => {
    const total = orderItems.reduce((total, item) => {
      console.log(`💰 Adding ${item.name} (${item.quantity}x$${item.unitPrice}) = $${item.totalPrice} to total`);
      return total + item.totalPrice;
    }, 0);
    console.log('💰 Final total:', total);
    return total;
  };

  // Filter products based on search and filter criteria
  const getFilteredProducts = () => {
    if (!supplierProducts || supplierProducts.length === 0) return [];
    
    return supplierProducts.filter(product => {
      // Search filter
      if (productFilters.search && !product.name.toLowerCase().includes(productFilters.search.toLowerCase()) &&
          !product.description.toLowerCase().includes(productFilters.search.toLowerCase()) &&
          !product.brand.toLowerCase().includes(productFilters.search.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (productFilters.category !== 'all' && product.category !== productFilters.category) {
        return false;
      }
      
      // Price filters
      if (productFilters.minPrice && product.price < parseFloat(productFilters.minPrice)) {
        return false;
      }
      if (productFilters.maxPrice && product.price > parseFloat(productFilters.maxPrice)) {
        return false;
      }
      
      // Stock filter
      if (productFilters.inStock === 'inStock' && product.stock <= 0) {
        return false;
      }
      if (productFilters.inStock === 'outOfStock' && product.stock > 0) {
        return false;
      }
      
      return true;
    });
  };

  // Get unique categories from products
  const getProductCategories = () => {
    if (!supplierProducts || supplierProducts.length === 0) return [];
    const categories = [...new Set(supplierProducts.map(product => product.category))];
    return categories.filter(category => category); // Remove empty categories
  };

  // Export products to CSV
  const exportProductsToCSV = () => {
    if (!supplierProducts || supplierProducts.length === 0) {
      alert('No products to export');
      return;
    }

    const headers = ['Name', 'Description', 'Category', 'Brand', 'Price', 'Stock', 'SKU'];
    const csvContent = [
      headers.join(','),
      ...getFilteredProducts().map(product => [
        `"${product.name}"`,
        `"${product.description || ''}"`,
        `"${product.category || ''}"`,
        `"${product.brand || ''}"`,
        product.price,
        product.stock,
        `"${product.sku || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedSupplier?.companyName}_products.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (view === 'products') {
    return (
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center text-sm font-medium">
            <button 
              onClick={handleBackToSuppliers}
            className="text-blue-600 hover:text-blue-800 flex items-center"
            >
            Suppliers
            </button>
          <span className="mx-2 text-gray-500">/</span>
          <span className="text-gray-700">{selectedSupplier?.companyName || 'Supplier'} Products</span>
        </nav>
        
        {/* Header with Supplier Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-semibold text-gray-900">{selectedSupplier?.companyName}</h2>
            <div className="mt-1 text-sm text-gray-600 space-y-1">
              <p className="flex items-center">
                <span className="font-medium mr-2">Contact:</span> 
                {selectedSupplier?.contactPerson?.email || selectedSupplier?.userId?.email}
              </p>
              {selectedSupplier?.categories?.length > 0 && (
                <p className="flex items-center">
                  <span className="font-medium mr-2">Categories:</span>
                  {selectedSupplier?.categories?.join(', ')}
              </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
          {/* Debug Panel - Remove in production */}
          {orderItems.length > 0 && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded text-xs">
              <strong>Debug:</strong> {orderItems.length} items | 
              {orderItems.map((item, i) => ` ${item.name}(${item.quantity})`).join(', ')}
            </div>
          )}
          
          {orderItems.length > 0 && (
            <button 
              onClick={() => setShowOrderModal(true)}
              className="btn btn-primary"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Review Order ({orderItems.length})
            </button>
          )}
            <button 
              onClick={exportProductsToCSV}
              className="btn btn-secondary"
              disabled={supplierProducts.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Products
            </button>
            <button 
              onClick={handleBackToSuppliers}
              className="btn btn-outline"
            >
              ← Back to Suppliers
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Search products..."
              value={productFilters.search}
              onChange={(e) => setProductFilters({ ...productFilters, search: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={productFilters.category}
              onChange={(e) => setProductFilters({ ...productFilters, category: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {getProductCategories().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Min Price"
              value={productFilters.minPrice}
              onChange={(e) => setProductFilters({ ...productFilters, minPrice: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="number"
              placeholder="Max Price"
              value={productFilters.maxPrice}
              onChange={(e) => setProductFilters({ ...productFilters, maxPrice: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={productFilters.inStock}
              onChange={(e) => setProductFilters({ ...productFilters, inStock: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Stock</option>
              <option value="inStock">In Stock</option>
              <option value="outOfStock">Out of Stock</option>
            </select>
          </div>
          
          <div className="mt-3 flex justify-between items-center">
            <button
              onClick={() => setProductFilters({ search: '', category: 'all', minPrice: '', maxPrice: '', inStock: 'all' })}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
            <span className="text-sm text-gray-500">
              {getFilteredProducts().length} of {supplierProducts.length} products
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {!isLoading && getFilteredProducts().length > 0 ? (
            getFilteredProducts().map((product) => {
              console.log('🔍 Rendering product card:', product.name, 'ID:', product._id, 'Price:', product.price);
              return (
              <div key={product._id || product.id} className="bg-white rounded-lg shadow p-6">
                {product.image && (product.image.url || typeof product.image === 'string') && (
                  <img 
                    src={typeof product.image === 'string' ? product.image : product.image.url} 
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                    onError={(e) => {
                      console.log('Image load error for:', product.name);
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                  </span>
                  <span className="text-sm font-medium text-gray-500">{product.category}</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold text-walmart-blue">${product.price}</p>
                    <p className="text-xs text-gray-500">Brand: {product.brand}</p>
                  </div>
                  <button 
                    onClick={() => {
                      console.log('🔍 Button clicked for product:', product.name, 'ID:', product._id || product.id, 'Price:', product.price);
                      console.log('🔍 Full product object:', product);
                      handleAddToOrder(product);
                    }}
                    disabled={product.stock === 0}
                    className="btn btn-sm btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Order
                  </button>
                </div>
              </div>
            );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {supplierProducts.length === 0 
                  ? 'No products available' 
                  : 'No products match your filters'
                }
              </p>
              <p className="text-sm text-gray-400">
                {supplierProducts.length === 0 
                  ? 'This supplier has no products in your store' 
                  : 'Try adjusting your search criteria'
                }
              </p>
            </div>
          )}
        </div>

        {/* Order Review Modal */}
        {showOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Review Order</h3>
                  <button 
                    onClick={() => setShowOrderModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Supplier: {selectedSupplier?.companyName}</h4>
                    <p className="text-sm text-gray-600">
                      Contact: {selectedSupplier?.contactPerson?.email}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Order Items: ({orderItems.length})</h4>
                    {console.log('🔍 Order Modal - Order Items:', orderItems.map(item => ({ name: item.name, id: item.productId, qty: item.quantity, total: item.totalPrice })))}
                    {orderItems.map((item, index) => (
                      <div key={`${item.productId}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        {console.log('🔍 Rendering order item:', { name: item.name, id: item.productId, qty: item.quantity, price: item.unitPrice, total: item.totalPrice })}
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">${item.unitPrice} each</p>
                          <p className="text-xs text-gray-500">ID: {item.productId}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => {
                              console.log('🔽 Decreasing quantity for:', item.name, 'ID:', item.productId);
                              updateOrderQuantity(item.productId, item.quantity - 1);
                            }}
                            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => {
                              console.log('🔼 Increasing quantity for:', item.name, 'ID:', item.productId);
                              updateOrderQuantity(item.productId, item.quantity + 1);
                            }}
                            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                          >
                            +
                          </button>
                          <button 
                            onClick={() => {
                              console.log('🗑️ Removing item:', item.name, 'ID:', item.productId);
                              removeFromOrder(item.productId);
                            }}
                            className="ml-2 text-red-600 hover:text-red-800"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="font-medium">${item.totalPrice.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total:</span>
                      <span>${getTotalOrderValue().toFixed(2)}</span>
                    </div>
                    {console.log('🔍 Total calculation debug:', {
                      orderItems: orderItems,
                      totalValue: getTotalOrderValue(),
                      itemTotals: orderItems.map(item => ({ name: item.name, totalPrice: item.totalPrice }))
                    })}
                  </div>

                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setShowOrderModal(false)}
                      className="flex-1 btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handlePlaceOrder}
                      className="flex-1 btn btn-primary"
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Supplier Management</h2>
        <div className="flex space-x-2">
          <button 
            onClick={refreshSuppliers} 
            className="btn btn-secondary flex items-center"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh Suppliers'}
          </button>
          <div className="text-sm text-gray-600">
            {safeSuppliers.length || 0} suppliers assigned to your store
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-walmart-blue focus:border-walmart-blue"
              />
            </div>
          </div>
          <button className="btn btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-walmart-blue"></div>
              <p className="text-lg">Loading suppliers...</p>
            </div>
          </div>
        </div>
      )}

      {safeSuppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier._id} className="bg-white shadow-lg rounded-lg overflow-hidden">
              {/* Supplier Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                <h3 className="text-lg font-semibold text-white">{supplier.companyName}</h3>
                <div className="flex items-center mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    supplier.isActive && supplier.isApproved 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {supplier.isActive && supplier.isApproved ? 'Active & Approved' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Supplier Details */}
              <div className="p-4 space-y-3">
                {/* Contact Person */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-600">Contact Person</h4>
                  <div className="mt-1">
                    {supplier.contactPerson?.name && (
                      <p className="text-sm">{supplier.contactPerson.name}</p>
                    )}
                    {supplier.contactPerson?.email && (
                      <p className="text-sm text-blue-600">{supplier.contactPerson.email}</p>
                    )}
                    {supplier.contactPerson?.phone && (
                      <p className="text-sm">{supplier.contactPerson.phone}</p>
                    )}
                    {!supplier.contactPerson?.name && supplier.userId && (
                      <p className="text-sm">{supplier.userId?.firstName} {supplier.userId?.lastName}</p>
                    )}
                    {!supplier.contactPerson?.email && supplier.userId?.email && (
                      <p className="text-sm text-blue-600">{supplier.userId.email}</p>
                    )}
                  </div>
                </div>

                {/* Company Info */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-600">Company Information</h4>
                  <div className="mt-1 space-y-1">
                    {supplier.companyInfo?.address && (
                      <p className="text-sm text-gray-600">
                        📍 {supplier.companyInfo.address}
                      </p>
                    )}
                    {supplier.companyInfo?.taxId && (
                      <p className="text-sm text-gray-600">
                        🏢 Tax ID: {supplier.companyInfo.taxId}
                      </p>
                    )}
                    {supplier.companyInfo?.registrationNumber && (
                      <p className="text-sm text-gray-600">
                        📄 Reg. No: {supplier.companyInfo.registrationNumber}
                      </p>
                    )}
                  </div>
                </div>

                {/* Categories */}
                {supplier.categories && supplier.categories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600">Product Categories</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {supplier.categories.map((category, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleViewProducts(supplier)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Products
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-8">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium">No suppliers found for your store.</p>
          <p className="text-sm text-gray-400">Suppliers who have registered for your store will appear here.</p>
          <button 
            onClick={refreshSuppliers}
            className="mt-4 btn btn-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Suppliers
          </button>
        </div>
      )}
    </div>
  );
};

// Reports Tab Component
const ReportsTab = ({ reports, setReports }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReports = reports.filter(report =>
    report.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Reports & Analytics</h2>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Report
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-walmart-blue focus:border-walmart-blue"
              />
            </div>
          </div>
          <button className="btn btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <div key={report._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  report.status === 'ready' ? 'bg-green-100 text-green-800' :
                  report.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {report.status}
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{report.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{report.type}</p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">
                    Created: {format(new Date(report.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="btn btn-sm btn-secondary">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="btn btn-sm btn-primary">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No reports found</p>
            <p className="text-sm text-gray-400">Try adjusting your search terms</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ data }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Advanced Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Sales Trends</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Sales Trends Chart</p>
              <p className="text-sm text-gray-400">Advanced visualization coming soon</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Performance Chart</p>
              <p className="text-sm text-gray-400">Advanced visualization coming soon</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900">Revenue Growth</h4>
            <p className="text-2xl font-bold text-blue-600">+15.3%</p>
            <p className="text-sm text-blue-600">vs last quarter</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900">Customer Satisfaction</h4>
            <p className="text-2xl font-bold text-green-600">94.2%</p>
            <p className="text-sm text-green-600">average rating</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900">Efficiency Score</h4>
            <p className="text-2xl font-bold text-purple-600">87.5%</p>
            <p className="text-sm text-purple-600">operational efficiency</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Alerts Tab Component
const AlertsTab = ({ alerts }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Alerts & Notifications</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <RefreshCw className="w-4 h-4 mr-2 inline" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-gray-900">
                {alerts?.lowStock || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {alerts?.outOfStock || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {alerts?.pendingOrders || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium">Low Stock Alert</p>
              <p className="text-xs text-gray-600">Check inventory levels for critical items</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-blue-50 rounded-lg">
            <Package className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium">New Order Received</p>
              <p className="text-xs text-gray-600">Review and approve pending orders</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard; 