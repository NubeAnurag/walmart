import React, { useState, useEffect } from 'react';
import { managerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Search, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  Edit, 
  RefreshCw,
  BarChart3
} from 'lucide-react';

const InventoryManagement = () => {
  const { user } = useAuth();
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 20
  });
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockUpdateData, setStockUpdateData] = useState({
    type: 'in',
    quantity: '',
    reason: '',
    reference: ''
  });

  // Debug function to show current user and auth status
  const showDebugInfo = () => {
    console.log('🔍 Debug Info:');
    console.log('👤 Current user:', user);
    console.log('🔑 Auth token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
    console.log('📊 User role:', user?.role);
    console.log('🏪 Store ID:', user?.storeId);
    console.log('🔍 Current filters:', filters);
    
    alert(`Debug Info:
User: ${user?.firstName} ${user?.lastName}
Role: ${user?.role}
Store: ${user?.storeId?.name || 'No store'}
Token: ${localStorage.getItem('authToken') ? 'Present' : 'Missing'}
Current Category: ${filters.category}`);
  };

  useEffect(() => {
    fetchInventoryData();
    fetchAnalytics();
    fetchAlerts();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Starting inventory fetch...');
      console.log('🔄 Filters:', filters);
      
      const response = await managerAPI.getInventoryProducts(filters);
      console.log('📦 Inventory data response:', response);
      console.log('📦 Response type:', typeof response);
      console.log('📦 Response keys:', Object.keys(response || {}));
      
      if (response && response.success) {
        console.log('✅ Successful response, products:', response.data?.products?.length || 0);
        setInventoryData(response.data?.products || []);
      } else {
        console.log('❌ Response not successful:', response);
        setError(response?.message || 'Failed to fetch inventory data');
      }
    } catch (err) {
      console.error('❌ Error fetching inventory:', err);
      console.error('❌ Error name:', err.name);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error response:', err.response);
      setError(err.response?.data?.message || err.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await managerAPI.getInventoryAnalytics();
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error('❌ Error fetching analytics:', err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await managerAPI.getStockAlerts();
      if (response.success) {
        setAlerts(response.data);
      }
    } catch (err) {
      console.error('❌ Error fetching alerts:', err);
    }
  };

  const handleStockUpdate = async () => {
    try {
      if (!selectedProduct || !stockUpdateData.quantity) {
        alert('Please fill in all required fields');
        return;
      }

      const response = await managerAPI.updateStock(selectedProduct._id, stockUpdateData);
      
      if (response.success) {
        alert('Stock updated successfully!');
        setShowStockModal(false);
        setStockUpdateData({ type: 'in', quantity: '', reason: '', reference: '' });
        setSelectedProduct(null);
        await fetchInventoryData();
        await fetchAnalytics();
        await fetchAlerts();
      } else {
        alert(response.message || 'Failed to update stock');
      }
    } catch (err) {
      console.error('❌ Error updating stock:', err);
      alert(err.response?.data?.message || 'Failed to update stock');
    }
  };

  const handleDebugCheckOrders = async () => {
    try {
      console.log('🔍 Calling debug check orders...');
      const response = await managerAPI.debugCheckOrders();
      
      if (response.success) {
        console.log('📊 Debug data:', response.data);
        alert(`Found ${response.data.orders.length} orders and ${response.data.inventoryCount} inventory records. Check console for details.`);
      } else {
        alert(response.message || 'Failed to check orders');
      }
    } catch (err) {
      console.error('❌ Error checking orders:', err);
      alert(err.response?.data?.message || 'Failed to check orders');
    }
  };

  const handleDebugFixOrders = async () => {
    try {
      console.log('🔧 Calling debug fix orders...');
      const response = await managerAPI.debugFixOrders();
      
      if (response.success) {
        alert(response.message);
        // Refresh the data
        await fetchInventoryData();
        await fetchAnalytics();
        await fetchAlerts();
      } else {
        alert(response.message || 'Failed to fix orders');
      }
    } catch (err) {
      console.error('❌ Error fixing orders:', err);
      alert(err.response?.data?.message || 'Failed to fix orders');
    }
  };

  const getStockStatusColor = (product) => {
    if (!product.inventory) return 'bg-gray-100 text-gray-800';
    
    const { quantity, reorderLevel } = product.inventory;
    
    if (quantity === 0) return 'bg-red-100 text-red-800';
    if (quantity <= reorderLevel) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStockStatusText = (product) => {
    if (!product.inventory) return 'Not Tracked';
    
    const { quantity, reorderLevel } = product.inventory;
    
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= reorderLevel) return 'Low Stock';
    return 'In Stock';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          onClick={fetchInventoryData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing only products received through your orders
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={showDebugInfo}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
          >
            Debug Info
          </button>
          <button
            onClick={handleDebugCheckOrders}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center"
          >
            Check Orders
          </button>
          <button
            onClick={handleDebugFixOrders}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            Fix Orders
          </button>
          <button
            onClick={fetchInventoryData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Products from Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.overview?.totalProducts || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analytics.overview?.totalValue || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.overview?.lowStockCount || 0}
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
                  {analytics.overview?.outOfStockCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts && alerts.totalAlerts > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-medium text-yellow-800">Stock Alerts</h3>
          </div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.alerts.map((alert, index) => (
              <div key={index} className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-900">{alert.title}</h4>
                <p className="text-sm text-gray-600">{alert.count} items</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Clothing">Clothing</option>
            <option value="Furniture">Furniture</option>
            <option value="Home & Garden">Home & Garden</option>
            <option value="Food & Beverages">Food & Beverages</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters({ ...filters, sortBy, sortOrder, page: 1 });
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="stockLevel-asc">Stock (Low to High)</option>
            <option value="stockLevel-desc">Stock (High to Low)</option>
            <option value="price-asc">Price (Low to High)</option>
            <option value="price-desc">Price (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryData.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {product.image?.url && (
                        <img 
                          src={product.image.url} 
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover mr-3"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.inventory?.quantity || 0}
                    {product.inventory?.reorderLevel && (
                      <span className="text-xs text-gray-500 ml-1">
                        (Min: {product.inventory.reorderLevel})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(product)}`}>
                      {getStockStatusText(product)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.inventory?.updatedAt ? formatDate(product.inventory.updatedAt) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowProductModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowStockModal(true);
                      }}
                      className="text-green-600 hover:text-green-900"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {inventoryData.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No inventory items found</p>
            <p className="text-sm text-gray-400">
              {filters.search || filters.category !== 'all' || filters.status !== 'all' 
                ? 'Try adjusting your search filters' 
                : 'No products found in your orders yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Product Details</h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                {selectedProduct.image?.url && (
                  <img 
                    src={selectedProduct.image.url} 
                    alt={selectedProduct.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h4 className="text-xl font-medium">{selectedProduct.name}</h4>
                  <p className="text-gray-600">{selectedProduct.category}</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(selectedProduct.price)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <p className="text-sm text-gray-900">{selectedProduct.sku || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand</label>
                  <p className="text-sm text-gray-900">{selectedProduct.brand || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                  <p className="text-sm text-gray-900">{selectedProduct.inventory?.quantity || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reorder Level</label>
                  <p className="text-sm text-gray-900">{selectedProduct.inventory?.reorderLevel || 'Not set'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900">{selectedProduct.description}</p>
              </div>

              {selectedProduct.inventory?.stockMovements && selectedProduct.inventory.stockMovements.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Recent Stock Movements</h5>
                  <div className="max-h-40 overflow-y-auto">
                    {selectedProduct.inventory.stockMovements.slice(-5).reverse().map((movement, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <div>
                          <span className={`px-2 py-1 text-xs rounded ${
                            movement.type === 'in' ? 'bg-green-100 text-green-800' : 
                            movement.type === 'out' ? 'bg-red-100 text-red-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {movement.type.toUpperCase()}
                          </span>
                          <span className="ml-2 text-sm">{movement.quantity}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(movement.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Update Stock</h3>
              <button
                onClick={() => setShowStockModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium">{selectedProduct.name}</h4>
                <p className="text-sm text-gray-600">
                  Current Stock: {selectedProduct.inventory?.quantity || 0}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Movement Type
                </label>
                <select
                  value={stockUpdateData.type}
                  onChange={(e) => setStockUpdateData({ ...stockUpdateData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="in">Stock In (Add)</option>
                  <option value="out">Stock Out (Remove)</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockUpdateData.quantity}
                  onChange={(e) => setStockUpdateData({ ...stockUpdateData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={stockUpdateData.reason}
                  onChange={(e) => setStockUpdateData({ ...stockUpdateData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Reason for stock movement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference (Optional)
                </label>
                <input
                  type="text"
                  value={stockUpdateData.reference}
                  onChange={(e) => setStockUpdateData({ ...stockUpdateData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Order ID, Transfer ID, etc."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleStockUpdate}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Update Stock
                </button>
                <button
                  onClick={() => {
                    setShowStockModal(false);
                    setStockUpdateData({ type: 'in', quantity: '', reason: '', reference: '' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement; 