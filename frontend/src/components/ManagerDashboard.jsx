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
  Building2
} from 'lucide-react';
import { managerAPI } from '../services/api';
import { format } from 'date-fns';
import { supplierAPI } from '../services/api';

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
      
      // Set state with the data
      setDashboardData(analyticsRes);
      setStaff(staffRes);
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
    const existingItem = orderItems.find(item => item.productId === product._id);
    if (existingItem) {
      setOrderItems(orderItems.map(item => 
        item.productId === product._id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
        productId: product._id,
        name: product.name,
        unitPrice: product.price,
        quantity: 1,
        totalPrice: product.price
      }]);
    }
  };

  const handlePlaceOrder = async () => {
    try {
      const orderData = {
        supplierId: selectedSupplier._id,
        items: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        notes: 'Order placed by manager'
      };

      await managerAPI.placeOrder(orderData);
      alert('Order placed successfully!');
      setShowOrderModal(false);
      setOrderItems([]);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
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
        {activeTab === 'staff' && <StaffTab staff={staff} setStaff={setStaff} />}
        {activeTab === 'inventory' && <InventoryTab inventory={inventory} setInventory={setInventory} />}
        {activeTab === 'suppliers' && <SuppliersTab 
          suppliers={suppliers} 
          setSuppliers={setSuppliers} 
          fetchSupplierProducts={fetchSupplierProducts}
          selectedSupplier={selectedSupplier}
          supplierProducts={supplierProducts}
          handleAddToOrder={handleAddToOrder}
          orderItems={orderItems}
          setOrderItems={setOrderItems}
          setShowOrderModal={setShowOrderModal}
          showOrderModal={showOrderModal}
          handlePlaceOrder={handlePlaceOrder}
        />}
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

  const filteredStaff = staff.filter(member =>
    member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Staff Management</h2>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search staff..."
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((member) => (
              <li key={member._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                          member.status === 'active' ? 'bg-green-100 text-green-800' :
                          member.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {member.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{member.position} • {member.employeeId}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="text-walmart-blue hover:text-walmart-blue-dark">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-6 py-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No staff members found</p>
              <p className="text-sm text-gray-400">Try adjusting your search terms</p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

// Inventory Tab Component  
const InventoryTab = ({ inventory, setInventory }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInventory = inventory.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Inventory Management</h2>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search inventory..."
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredInventory.length > 0 ? (
          filteredInventory.map((item) => (
            <div key={item._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  item.stock > item.reorderPoint ? 'bg-green-100 text-green-800' :
                  item.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {item.stock > item.reorderPoint ? 'In Stock' :
                   item.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{item.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{item.category}</p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">${item.price}</p>
                  <p className="text-xs text-gray-500">Stock: {item.stock}</p>
                </div>
                <button className="btn btn-sm btn-primary">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No inventory items found</p>
            <p className="text-sm text-gray-400">Try adjusting your search terms</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Suppliers Tab Component
const SuppliersTab = ({ 
  suppliers, 
  setSuppliers, 
  fetchSupplierProducts, 
  selectedSupplier, 
  supplierProducts, 
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

  const handleViewProducts = (supplier) => {
    fetchSupplierProducts(supplier._id);
    setView('products');
  };

  const handleBackToSuppliers = () => {
    setView('suppliers');
  };

  const removeFromOrder = (productId) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId));
  };

  const updateOrderQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromOrder(productId);
    } else {
      setOrderItems(orderItems.map(item => 
        item.productId === productId 
          ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
          : item
      ));
    }
  };

  const getTotalOrderValue = () => {
    return orderItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  if (view === 'products') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleBackToSuppliers}
              className="btn btn-secondary"
            >
              ← Back to Suppliers
            </button>
            <div>
              <h2 className="text-xl font-semibold">{selectedSupplier?.companyName}</h2>
              <p className="text-sm text-gray-600">
                {selectedSupplier?.contactPerson?.email} • {selectedSupplier?.categories?.join(', ')}
              </p>
            </div>
          </div>
          {orderItems.length > 0 && (
            <button 
              onClick={() => setShowOrderModal(true)}
              className="btn btn-primary"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Review Order ({orderItems.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {supplierProducts.length > 0 ? (
            supplierProducts.map((product) => (
              <div key={product._id} className="bg-white rounded-lg shadow p-6">
                {product.image && (
                  <img 
                    src={product.image.url} 
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
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
                    onClick={() => handleAddToOrder(product)}
                    disabled={product.stock === 0}
                    className="btn btn-sm btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Order
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No products available</p>
              <p className="text-sm text-gray-400">This supplier has no products in your store</p>
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
                    <h4 className="font-medium">Order Items:</h4>
                    {orderItems.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">${item.unitPrice} each</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => updateOrderQuantity(item.productId, item.quantity - 1)}
                            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateOrderQuantity(item.productId, item.quantity + 1)}
                            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                          >
                            +
                          </button>
                          <button 
                            onClick={() => removeFromOrder(item.productId)}
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
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Suppliers
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

export default ManagerDashboard; 