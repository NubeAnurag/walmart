import React, { useState, useEffect } from 'react';
import { managerAPI } from '../services/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Package, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  BarChart3,
  Calendar,
  Award,
  Target,
  Filter,
  RefreshCw,
  Download
} from 'lucide-react';

const SupplierPerformanceMetrics = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    period: '30',
    supplierId: '',
    startDate: '',
    endDate: ''
  });

  // Debug authentication state
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    console.log('🔐 Auth Debug - Token exists:', !!token);
    console.log('🔐 Auth Debug - User exists:', !!user);
    if (user) {
      try {
        const userData = JSON.parse(user);
        console.log('🔐 Auth Debug - User role:', userData.role);
        console.log('🔐 Auth Debug - User data:', userData);
      } catch (e) {
        console.error('🔐 Auth Debug - Error parsing user data:', e);
      }
    }
  }, []);

  useEffect(() => {
    fetchPerformanceData();
  }, [filters]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching supplier performance metrics with filters:', filters);
      const response = await managerAPI.getSupplierPerformanceMetrics(filters);
      console.log('📊 Supplier performance metrics response:', response);
      setPerformanceData(response.data);
    } catch (err) {
      console.error('❌ Error fetching supplier performance metrics:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      
      let errorMessage = 'Failed to load performance metrics';
      
      if (err.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. Manager role required.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Performance metrics endpoint not found.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value) => {
    return `${Math.round(value || 0)}%`;
  };

  const formatNumber = (value) => {
    return (value || 0).toLocaleString();
  };

  const formatCurrency = (value) => {
    return `$${(value || 0).toLocaleString()}`;
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPerformanceIcon = (score) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  const exportToCSV = () => {
    if (!performanceData?.suppliers) return;
    
    const csvData = performanceData.suppliers.map(supplier => ({
      'Supplier Name': supplier.supplierName,
      'Company Name': supplier.companyName,
      'Total Orders': supplier.totalOrders,
      'Delivered Orders': supplier.deliveredOrders,
      'On-Time Delivery Rate': `${supplier.onTimeDeliveryRate}%`,
      'Quantity Accuracy Rate': `${supplier.quantityAccuracyRate}%`,
      'Performance Score': `${supplier.performanceScore}%`,
      'Total Order Value': supplier.totalOrderValue,
      'Perfect Deliveries': supplier.perfectDeliveries,
      'Partial Deliveries': supplier.partialDeliveries,
      'Late Deliveries': supplier.lateDeliveries,
      'Avg Delivery Time Diff (Days)': supplier.avgDeliveryTimeDiff || 0
    }));
    
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-performance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchPerformanceData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { overview, suppliers, topPerformers, bottomPerformers, categoryPerformance } = performanceData || {};

  // Check if there's no data to display
  if (performanceData && (!suppliers || suppliers.length === 0)) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Supplier Performance Metrics</h2>
          <button
            onClick={fetchPerformanceData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data Available</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            There are no delivered orders to analyze supplier performance. Performance metrics will be available after suppliers deliver orders and managers accept deliveries.
          </p>
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4 max-w-lg mx-auto">
            <h4 className="font-medium mb-2">To see performance metrics:</h4>
            <ol className="list-decimal list-inside space-y-1 text-left">
              <li>Create orders to suppliers</li>
              <li>Wait for suppliers to approve orders</li>
              <li>Accept deliveries when they arrive</li>
              <li>Performance metrics will be calculated based on delivery data</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Supplier Performance Metrics</h2>
        <div className="flex space-x-2">
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={fetchPerformanceData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ period: '30', supplierId: '', startDate: '', endDate: '' })}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalSuppliers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg On-Time Delivery</p>
                <p className="text-2xl font-bold text-gray-900">{formatPercentage(overview.avgOnTimeDeliveryRate)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Quantity Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">{formatPercentage(overview.avgQuantityAccuracyRate)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Order Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.totalOrderValue)}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <BarChart3 className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Award className="w-5 h-5 mr-2 text-green-600" />
              Top Performers
            </h3>
          </div>
          <div className="p-6">
            {topPerformers && topPerformers.length > 0 ? (
              <div className="space-y-4">
                {topPerformers.map((supplier, index) => (
                  <div key={supplier._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-green-600 font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{supplier.supplierName}</p>
                        <p className="text-sm text-gray-500">{supplier.companyName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatPercentage(supplier.performanceScore)}</p>
                      <p className="text-sm text-gray-500">{supplier.totalOrders} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No performance data available</p>
            )}
          </div>
        </div>

        {/* Bottom Performers */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
              Needs Improvement
            </h3>
          </div>
          <div className="p-6">
            {bottomPerformers && bottomPerformers.length > 0 ? (
              <div className="space-y-4">
                {bottomPerformers.map((supplier, index) => (
                  <div key={supplier._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-red-600 font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{supplier.supplierName}</p>
                        <p className="text-sm text-gray-500">{supplier.companyName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{formatPercentage(supplier.performanceScore)}</p>
                      <p className="text-sm text-gray-500">{supplier.totalOrders} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No performance data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Supplier Performance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Performance Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  On-Time Delivery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity Accuracy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Perfect Deliveries
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers && suppliers.map((supplier) => (
                <tr key={supplier._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{supplier.supplierName}</div>
                      <div className="text-sm text-gray-500">{supplier.companyName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(supplier.performanceScore)}`}>
                        {getPerformanceIcon(supplier.performanceScore)}
                        <span className="ml-1">{formatPercentage(supplier.performanceScore)}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPercentage(supplier.onTimeDeliveryRate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPercentage(supplier.quantityAccuracyRate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {supplier.deliveredOrders}/{supplier.totalOrders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(supplier.totalOrderValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPercentage(supplier.perfectDeliveryRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Performance */}
      {categoryPerformance && categoryPerformance.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Performance by Category</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryPerformance.map((category) => (
                <div key={category._id} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{category._id}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">On-Time Rate:</span>
                      <span className="font-medium">{formatPercentage(category.onTimeRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accuracy Rate:</span>
                      <span className="font-medium">{formatPercentage(category.accuracyRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Value:</span>
                      <span className="font-medium">{formatCurrency(category.totalValue)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierPerformanceMetrics; 