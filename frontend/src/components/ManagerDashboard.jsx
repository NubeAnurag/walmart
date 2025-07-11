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
  Settings
} from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import io from 'socket.io-client';

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
  const [notifications, setNotifications] = useState([]);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [
        analyticsRes,
        staffRes,
        suppliersRes,
        inventoryRes,
        reportsRes
      ] = await Promise.all([
        axios.get('http://localhost:5001/api/analytics/dashboard', config),
        axios.get('http://localhost:5001/api/staff', config),
        axios.get('http://localhost:5001/api/suppliers', config),
        axios.get('http://localhost:5001/api/inventory', config),
        axios.get('http://localhost:5001/api/reports', config)
      ]);

      setDashboardData(analyticsRes.data);
      setStaff(staffRes.data);
      setSuppliers(suppliersRes.data);
      setInventory(inventoryRes.data);
      setReports(reportsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user.firstName} {user.lastName}! 📊
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <Bell className="w-6 h-6" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
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
        {activeTab === 'suppliers' && <SuppliersTab suppliers={suppliers} setSuppliers={setSuppliers} />}
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
const SuppliersTab = ({ suppliers, setSuppliers }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Supplier Management</h2>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </button>
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredSuppliers.length > 0 ? (
            filteredSuppliers.map((supplier) => (
              <li key={supplier._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Truck className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {supplier.companyName}
                        </p>
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                          supplier.status === 'active' ? 'bg-green-100 text-green-800' :
                          supplier.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {supplier.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {supplier.contactInfo?.email} • {supplier.categories?.join(', ')}
                      </p>
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
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No suppliers found</p>
              <p className="text-sm text-gray-400">Try adjusting your search terms</p>
            </li>
          )}
        </ul>
      </div>
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