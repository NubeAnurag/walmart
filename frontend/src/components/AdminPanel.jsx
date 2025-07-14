import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Building2, 
  BarChart3, 
  Trash2, 
  RefreshCw,
  Key,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Mail,
  Phone,
  User,
  Lock,
  Loader2
} from 'lucide-react';
import { adminAPI, storeAPI } from '../services/api';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeesByStore, setEmployeesByStore] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Create employee form state
  const [createEmployeeForm, setCreateEmployeeForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'staff',
    storeId: '',
    phone: '',
    password: '',
    staffType: ''
  });
  const [createEmployeeLoading, setCreateEmployeeLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Filters
  const [filters] = useState({
    search: '',
    role: '',
    storeId: ''
  });

  // Load initial data
  useEffect(() => {
    loadDashboardStats();
    loadStores();
    if (activeTab === 'employees') {
      loadEmployees();
    } else if (activeTab === 'by-store') {
      loadEmployeesByStore();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboardStats = async () => {
    try {
      const response = await adminAPI.getDashboardStats();
      if (response.success) {
        setDashboardStats(response.data);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadStores = async () => {
    try {
      const response = await storeAPI.getStores();
      if (response.success) {
        setStores(response.data);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getEmployees(filters);
      if (response.success) {
        setEmployees(response.data.employees);
      }
    } catch (error) {
      setError('Error loading employees');
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeesByStore = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getEmployeesByStore();
      if (response.success) {
        setEmployeesByStore(response.data);
      }
    } catch (error) {
      setError('Error loading employees by store');
      console.error('Error loading employees by store:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setCreateEmployeeLoading(true);
    setError('');
    setSuccess('');
    setGeneratedPassword('');

    try {
      const response = await adminAPI.createEmployee(createEmployeeForm);
      if (response.success) {
        setSuccess('Employee created successfully!');
        if (response.data.generatedPassword) {
          setGeneratedPassword(response.data.generatedPassword);
        }
        setCreateEmployeeForm({
          email: '',
          firstName: '',
          lastName: '',
          role: 'staff',
          storeId: '',
          phone: '',
          password: '',
          staffType: ''
        });
        // Refresh data
        loadDashboardStats();
        if (activeTab === 'employees') {
          loadEmployees();
        }
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error creating employee');
      console.error('Error creating employee:', error);
    } finally {
      setCreateEmployeeLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) {
      return;
    }

    try {
      const response = await adminAPI.deleteEmployee(employeeId);
      if (response.success) {
        setSuccess('Employee deactivated successfully');
        loadEmployees();
        loadDashboardStats();
      }
    } catch (error) {
      setError('Error deactivating employee');
      console.error('Error deactivating employee:', error);
    }
  };

  const handleResetPassword = async (employeeId) => {
    if (!window.confirm('Are you sure you want to reset this employee\'s password?')) {
      return;
    }

    try {
      const response = await adminAPI.resetEmployeePassword(employeeId);
      if (response.success) {
        setSuccess('Password reset successfully');
        if (response.data.generatedPassword) {
          alert(`New password: ${response.data.generatedPassword}`);
        }
      }
    } catch (error) {
      setError('Error resetting password');
      console.error('Error resetting password:', error);
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'create', label: 'Create Employee', icon: UserPlus },
    { id: 'employees', label: 'Employee List', icon: Users },
    { id: 'by-store', label: 'By Store', icon: Building2 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600">Employee Management System</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Welcome, Admin</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
            <button onClick={clearMessages} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-700">{success}</span>
            </div>
            <button onClick={clearMessages} className="text-green-400 hover:text-green-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {generatedPassword && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center mb-2">
              <Key className="h-5 w-5 text-blue-400 mr-2" />
              <span className="text-blue-700 font-medium">Generated Password</span>
            </div>
            <div className="bg-white p-3 rounded border font-mono text-sm">
              {generatedPassword}
            </div>
            <p className="text-blue-600 text-sm mt-2">
              Please save this password and share it securely with the employee.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-walmart-blue text-walmart-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {dashboardStats ? (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-blue-500" />
                      <div className="ml-4">
                        <p className="text-sm text-gray-600">Total Employees</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {dashboardStats.overview.totalEmployees}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <User className="h-8 w-8 text-green-500" />
                      <div className="ml-4">
                        <p className="text-sm text-gray-600">Managers</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {dashboardStats.overview.totalManagers}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-purple-500" />
                      <div className="ml-4">
                        <p className="text-sm text-gray-600">Staff</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {dashboardStats.overview.totalStaff}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <Building2 className="h-8 w-8 text-orange-500" />
                      <div className="ml-4">
                        <p className="text-sm text-gray-600">Stores</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {dashboardStats.overview.totalStores}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employees by Store */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-medium text-gray-900">Employees by Store</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dashboardStats.employeesByStore.map((store) => (
                        <div key={store._id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{store.storeName}</h4>
                            <span className="text-sm text-gray-500">{store.storeCode}</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total:</span>
                              <span className="font-medium">{store.totalEmployees}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Managers:</span>
                              <span className="font-medium">{store.managers}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Staff:</span>
                              <span className="font-medium">{store.staff}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Create New Employee</h3>
              <p className="text-gray-600">Add a new manager or staff member to the system</p>
            </div>
            <form onSubmit={handleCreateEmployee} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={createEmployeeForm.firstName}
                      onChange={(e) => setCreateEmployeeForm({
                        ...createEmployeeForm,
                        firstName: e.target.value
                      })}
                      className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={createEmployeeForm.lastName}
                      onChange={(e) => setCreateEmployeeForm({
                        ...createEmployeeForm,
                        lastName: e.target.value
                      })}
                      className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={createEmployeeForm.email}
                      onChange={(e) => setCreateEmployeeForm({
                        ...createEmployeeForm,
                        email: e.target.value
                      })}
                      className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={createEmployeeForm.phone}
                      onChange={(e) => setCreateEmployeeForm({
                        ...createEmployeeForm,
                        phone: e.target.value
                      })}
                      className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    value={createEmployeeForm.role}
                    onChange={(e) => setCreateEmployeeForm({
                      ...createEmployeeForm,
                      role: e.target.value,
                      staffType: '' // Reset staff type when role changes
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                    required
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                {/* Staff Type Field - Only show for staff role */}
                {createEmployeeForm.role === 'staff' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Staff Type *
                    </label>
                    <select
                      value={createEmployeeForm.staffType}
                      onChange={(e) => setCreateEmployeeForm({
                        ...createEmployeeForm,
                        staffType: e.target.value
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                      required
                    >
                      <option value="">Select Staff Type</option>
                      <option value="cashier">Cashier</option>
                      <option value="inventory">Inventory</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={createEmployeeForm.storeId}
                      onChange={(e) => setCreateEmployeeForm({
                        ...createEmployeeForm,
                        storeId: e.target.value
                      })}
                      className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                      required
                    >
                      <option value="">Select a store</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.storeCode} - {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password (Optional)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      value={createEmployeeForm.password}
                      onChange={(e) => setCreateEmployeeForm({
                        ...createEmployeeForm,
                        password: e.target.value
                      })}
                      className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                      placeholder="Leave blank to auto-generate"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    If left blank, a secure password will be generated automatically.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createEmployeeLoading}
                  className="bg-walmart-blue text-white px-6 py-2 rounded-md hover:bg-walmart-blue/90 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {createEmployeeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>{createEmployeeLoading ? 'Creating...' : 'Create Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'employees' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Employee List</h3>
                <button
                  onClick={loadEmployees}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Store
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-500" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {employee.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {employee.employeeId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              employee.role === 'manager' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {employee.role === 'manager' ? 'Manager' : 'Staff'}
                            </span>
                            {employee.role === 'staff' && employee.staffType && (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                employee.staffType === 'cashier' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {employee.staffType === 'cashier' ? 'Cashier' : 'Inventory'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.storeId ? (
                            <div>
                              <div className="font-medium">{employee.storeId.storeCode}</div>
                              <div className="text-gray-500">{employee.storeId.name}</div>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleResetPassword(employee.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Reset Password"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Deactivate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {employees.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No employees</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by creating a new employee.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'by-store' && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              employeesByStore.map((storeGroup) => (
                <div key={storeGroup.store.id} className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {storeGroup.store.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {storeGroup.store.code} • {storeGroup.employees.length} employees
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {storeGroup.store.address}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {storeGroup.employees.map((employee) => (
                        <div key={employee.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-500" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div className="text-sm text-gray-500 truncate">
                                {employee.employeeId}
                              </div>
                              <div className="text-xs text-gray-400">
                                {employee.role === 'manager' ? 'Manager' : 'Staff'}
                                {employee.role === 'staff' && employee.staffType && (
                                  <span className="ml-1">
                                    • {employee.staffType === 'cashier' ? 'Cashier' : 'Inventory'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {!loading && employeesByStore.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No employees have been assigned to any stores yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 