import React, { useState, useEffect, useCallback } from 'react';
import { 
  Star, 
  Package, 
  ShoppingCart, 
  Store, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { supplierAPI } from '../services/api';

const SupplierDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Categories for product form
  const categories = [
    'Electronics', 'Clothing', 'Furniture', 'Home & Garden', 'Sports & Outdoors',
    'Health & Beauty', 'Books', 'Toys & Games', 'Automotive', 'Food & Beverages',
    'Office Supplies', 'Pet Supplies', 'Baby & Kids', 'Tools & Hardware', 'Other'
  ];

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    brand: '',
    stock: '',
    image: null
  });

  const [formErrors, setFormErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);

  // Define fetch functions first
  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await supplierAPI.getDashboardStats();
      if (response.success) {
        setDashboardStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      
      const response = await supplierAPI.getProducts(params);
      if (response.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [searchTerm, categoryFilter]);

  const fetchOrders = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      
      const response = await supplierAPI.getOrders(params);
      if (response.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, [statusFilter]);

  const fetchStores = useCallback(async () => {
    try {
      const response = await supplierAPI.getStores();
      if (response.success) {
        setStores(response.data.stores);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardStats();
    fetchStores();
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab, fetchDashboardStats, fetchStores, fetchProducts, fetchOrders]);

  // Convert image file to base64
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle product form submission
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Validate form
    const errors = {};
    if (!productForm.name.trim()) errors.name = 'Product name is required';
    if (!productForm.description.trim()) {
      errors.description = 'Description is required';
    } else if (productForm.description.length > 2500) {
      errors.description = `Description is too long. Maximum 2500 characters allowed, but got ${productForm.description.length} characters.`;
    } else if (productForm.description.length < 10) {
      errors.description = 'Description must be at least 10 characters long';
    }
    if (!productForm.price || productForm.price <= 0) errors.price = 'Valid price is required';
    if (!productForm.category) errors.category = 'Category is required';
    if (!productForm.brand.trim()) errors.brand = 'Brand is required';
    if (!productForm.stock || productForm.stock < 0) errors.stock = 'Valid stock quantity is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      // Convert image to base64 if present
      let imageBase64 = null;
      if (productForm.image) {
        try {
          imageBase64 = await convertImageToBase64(productForm.image);
        } catch (error) {
          console.error('Error converting image to base64:', error);
          alert('Error processing image. Please try again.');
          return;
        }
      }

      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: productForm.price,
        category: productForm.category,
        brand: productForm.brand,
        stock: productForm.stock,
        image: imageBase64
      };

      const response = selectedProduct 
        ? await supplierAPI.updateProduct(selectedProduct.id, productData)
        : await supplierAPI.addProduct(productData);

      if (response.success) {
        setShowAddModal(false);
        setShowEditModal(false);
        resetProductForm();
        fetchProducts();
        alert(selectedProduct ? 'Product updated successfully!' : 'Product added successfully!');
      } else {
        // Handle validation errors
        if (response.errors && Array.isArray(response.errors)) {
          const errorMessage = response.errors.join('\n');
          alert('Validation Error:\n' + errorMessage);
        } else {
          alert(response.message || 'Error saving product');
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      
      // Handle API validation errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessage = error.response.data.errors.join('\n');
        alert('Validation Error:\n' + errorMessage);
      } else if (error.response?.data?.message) {
        alert('Error saving product: ' + error.response.data.message);
      } else {
        alert('Error saving product: ' + error.message);
      }
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: '',
      category: '',
      brand: '',
      stock: '',
      image: null
    });
    setImagePreview(null);
    setSelectedProduct(null);
    setFormErrors({});
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      brand: product.brand,
      stock: product.stock,
      image: null
    });
    setImagePreview(product.image && product.image.url ? product.image.url : null);
    setShowEditModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await supplierAPI.deleteProduct(productId);
      if (response.success) {
        fetchProducts();
        alert('Product deleted successfully!');
      } else {
        alert(response.message || 'Error deleting product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const handleMarkOutOfStock = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to mark "${productName}" as out of stock?`)) {
      return;
    }

    try {
      const response = await supplierAPI.updateProduct(productId, { stock: 0 });
      if (response.success) {
        fetchProducts();
        alert('Product marked as out of stock successfully!');
      } else {
        alert(response.message || 'Error updating product stock');
      }
    } catch (error) {
      console.error('Error marking product as out of stock:', error);
      alert('Error updating product stock');
    }
  };

  const handleRestock = async (productId, productName) => {
    const newStock = prompt(`Enter new stock quantity for "${productName}":`, '10');
    
    if (newStock === null) return; // User cancelled
    
    const stockNumber = parseInt(newStock);
    if (isNaN(stockNumber) || stockNumber < 1) {
      alert('Please enter a valid stock quantity (minimum 1)');
      return;
    }

    try {
      const response = await supplierAPI.updateProduct(productId, { stock: stockNumber });
      if (response.success) {
        fetchProducts();
        alert(`Product restocked successfully! New stock: ${stockNumber}`);
      } else {
        alert(response.message || 'Error updating product stock');
      }
    } catch (error) {
      console.error('Error restocking product:', error);
      alert('Error updating product stock');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only JPEG, PNG, and WebP images are allowed');
        return;
      }

      setProductForm(prev => ({ ...prev, image: file }));
      
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await supplierAPI.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        fetchOrders();
        alert('Order status updated successfully!');
      } else {
        alert(response.message || 'Error updating order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeliveryTimeUpdate = async (orderId, newDeliveryTime) => {
    try {
      const response = await supplierAPI.updateDeliveryTime(orderId, newDeliveryTime);
      if (response.success) {
        fetchOrders();
        alert('Delivery time updated successfully!');
      } else {
        alert(response.message || 'Error updating delivery time');
      }
    } catch (error) {
      console.error('Error updating delivery time:', error);
      alert('Error updating delivery time: ' + (error.response?.data?.message || error.message));
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400 opacity-50" />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Order Received':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'Order Completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Order Rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Order Received':
        return 'bg-blue-100 text-blue-800';
      case 'Order Completed':
        return 'bg-green-100 text-green-800';
      case 'Order Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-walmart-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Supplier Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your products and orders</p>
            </div>
            <div className="flex items-center space-x-4">
              {dashboardStats && (
                <div className="bg-white rounded-lg shadow px-4 py-2 border">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      {renderStars(dashboardStats.rating.average)}
                    </div>
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">
                        {dashboardStats.rating.average.toFixed(1)} Rating
                      </div>
                      <div className="text-gray-500">
                        {dashboardStats.rating.count} reviews
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {stores.length > 0 && (
                <div className="bg-white rounded-lg shadow px-4 py-2 border">
                  <div className="flex items-center space-x-2">
                    <Store className="w-5 h-5 text-walmart-blue" />
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">
                        {stores.length} Store{stores.length > 1 ? 's' : ''}
                      </div>
                      <div className="text-gray-500">
                        {stores.map(store => store.storeCode).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: TrendingUp },
              { id: 'products', name: 'Product Catalog', icon: Package },
              { id: 'orders', name: 'Order Management', icon: ShoppingCart }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-walmart-blue text-walmart-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardStats?.productStats?.totalProducts || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShoppingCart className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Stock</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardStats?.productStats?.totalStock || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Out of Stock</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardStats?.productStats?.outOfStock || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg. Price</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${dashboardStats?.productStats?.averagePrice?.toFixed(2) || '0.00'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Associated Stores */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Store className="w-5 h-5 mr-2 text-walmart-blue" />
                  Your Assigned Stores
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  These are the stores where your products are available for sale
                </p>
              </div>
              <div className="p-6">
                {stores.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stores.map((store) => (
                      <div key={store.id || store._id} className="bg-gradient-to-br from-walmart-blue to-blue-600 rounded-lg p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="bg-white bg-opacity-20 rounded-full p-3">
                            <Store className="w-6 h-6" />
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium opacity-80">STORE ID</div>
                            <div className="text-sm font-bold">{store.storeCode}</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-2">{store.name}</h4>
                          {store.address && (
                            <p className="text-sm opacity-90 mb-2">
                              {store.address.street}, {store.address.city}
                            </p>
                          )}
                          {store.phone && (
                            <p className="text-sm opacity-90">
                              📞 {store.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Store className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No stores assigned</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Contact your administrator to get assigned to stores
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
              </div>
              <div className="p-6">
                {dashboardStats?.recentOrders?.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardStats.recentOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{order.orderNumber}</h4>
                            <p className="text-sm text-gray-500">{order.customerName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">${order.totalAmount}</p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No recent orders</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Product Management Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Product Catalog</h2>
                <p className="mt-1 text-sm text-gray-500">Manage your product inventory</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-walmart-blue hover:bg-walmart-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-walmart-blue"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </button>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <button
                  onClick={fetchProducts}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-walmart-blue"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                {products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                      <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-w-1 aspect-h-1 bg-gray-200">
                          {product.image && product.image.url ? (
                            <img
                              src={product.image.url}
                              alt={product.name}
                              className="w-full h-48 object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                              <ImageIcon className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{product.category}</p>
                          <p className="text-sm text-gray-500">{product.brand}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-900">${product.price}</span>
                            <span className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Stock: {product.stock}
                            </span>
                          </div>
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </button>
                            </div>
                            {product.stock > 0 ? (
                              <button
                                onClick={() => handleMarkOutOfStock(product.id, product.name)}
                                className="w-full inline-flex items-center justify-center px-3 py-2 border border-yellow-300 rounded-md text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                              >
                                <AlertCircle className="w-4 h-4 mr-1" />
                                Mark Out of Stock
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRestock(product.id, product.name)}
                                className="w-full inline-flex items-center justify-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
                              >
                                <Package className="w-4 h-4 mr-1" />
                                Restock
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by adding your first product.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-walmart-blue hover:bg-walmart-blue/90"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Order Management Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
                <p className="mt-1 text-sm text-gray-500">Track and manage customer orders</p>
              </div>
            </div>

            {/* Order Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="Order Received">Order Received</option>
                  <option value="Order Completed">Order Completed</option>
                  <option value="Order Rejected">Order Rejected</option>
                </select>
                <button
                  onClick={fetchOrders}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-walmart-blue"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                            <div className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                            <div className="text-sm text-gray-500">{order.customerEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {order.items?.map((item, index) => (
                              <div key={index} className="truncate">
                                {item.productName} x{item.quantity}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">${order.totalAmount}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(order.status)}
                            <select
                              value={order.status}
                              onChange={(e) => handleOrderStatusUpdate(order.id, e.target.value)}
                              className="ml-2 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-walmart-blue"
                            >
                              <option value="Order Received">Order Received</option>
                              <option value="Order Completed">Order Completed</option>
                              <option value="Order Rejected">Order Rejected</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.managerName || 'Not Assigned'}</div>
                          <div className="text-sm text-gray-500">{order.storeId?.storeCode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.storeId?.name}</div>
                          <div className="text-sm text-gray-500">{order.storeId?.storeCode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.status !== 'Order Rejected' ? (
                            <input
                              type="datetime-local"
                              value={order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).toISOString().slice(0, 16) : ''}
                              onChange={(e) => handleDeliveryTimeUpdate(order.id, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-walmart-blue"
                            />
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {order.status === 'Order Received' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleOrderStatusUpdate(order.id, 'Order Completed')}
                                className="text-green-600 hover:text-green-900"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleOrderStatusUpdate(order.id, 'Order Rejected')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {orders.length === 0 && (
                <div className="text-center py-12">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
                  <p className="mt-1 text-sm text-gray-500">Orders will appear here when customers place them.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleProductSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        {selectedProduct ? 'Edit Product' : 'Add New Product'}
                      </h3>
                      
                      <div className="space-y-4">
                        {/* Product Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Product Name *</label>
                          <input
                            type="text"
                            value={productForm.name}
                            onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                            placeholder="Enter product name"
                          />
                          {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                        </div>

                        {/* Description */}
                        <div>
                          <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-700">Description *</label>
                            <span className={`text-xs ${
                              productForm.description.length > 2500 ? 'text-red-600' : 
                              productForm.description.length > 2000 ? 'text-yellow-600' : 'text-gray-500'
                            }`}>
                              {productForm.description.length}/2500 characters
                            </span>
                          </div>
                          <textarea
                            value={productForm.description}
                            onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={4}
                            maxLength={2500}
                            className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:border-transparent ${
                              productForm.description.length > 2500 
                                ? 'border-red-300 focus:ring-red-500' 
                                : 'border-gray-300 focus:ring-walmart-blue'
                            }`}
                            placeholder="Enter detailed product description (max 2500 characters)"
                          />
                          {productForm.description.length > 2500 && (
                            <p className="mt-1 text-sm text-red-600">
                              Description is too long. Please reduce it by {productForm.description.length - 2500} characters.
                            </p>
                          )}
                          {formErrors.description && <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>}
                          <p className="mt-1 text-xs text-gray-500">
                            Provide a detailed description including features, specifications, and benefits.
                          </p>
                        </div>

                        {/* Price and Stock */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Price ($) *</label>
                            <input
                              type="number"
                              step="0.01"
                              value={productForm.price}
                              onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                              placeholder="0.00"
                            />
                            {formErrors.price && <p className="mt-1 text-sm text-red-600">{formErrors.price}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Stock *</label>
                            <input
                              type="number"
                              value={productForm.stock}
                              onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                              placeholder="0"
                            />
                            {formErrors.stock && <p className="mt-1 text-sm text-red-600">{formErrors.stock}</p>}
                          </div>
                        </div>

                        {/* Category and Brand */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Category *</label>
                            <select
                              value={productForm.category}
                              onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                            >
                              <option value="">Select category</option>
                              {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                            {formErrors.category && <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Brand *</label>
                            <input
                              type="text"
                              value={productForm.brand}
                              onChange={(e) => setProductForm(prev => ({ ...prev, brand: e.target.value }))}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                              placeholder="Enter brand name"
                            />
                            {formErrors.brand && <p className="mt-1 text-sm text-red-600">{formErrors.brand}</p>}
                          </div>
                        </div>

                        {/* Store Information */}
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                          <div className="flex items-center">
                            <Store className="w-5 h-5 text-blue-600 mr-2" />
                            <div>
                              <h4 className="text-sm font-medium text-blue-900">
                                Product will be available in all your assigned stores
                              </h4>
                              <p className="text-sm text-blue-700 mt-1">
                                {stores.length > 0 ? (
                                  <>Stores: {stores.map(store => store.storeCode).join(', ')}</>
                                ) : (
                                  'No stores assigned yet'
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Image Upload */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Product Image</label>
                          <div className="mt-1 flex items-center space-x-4">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              onChange={handleImageChange}
                              className="hidden"
                              id="product-image"
                            />
                            <label
                              htmlFor="product-image"
                              className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Choose Image
                            </label>
                            {imagePreview && (
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-16 h-16 object-cover rounded-md border"
                              />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-500">JPEG, PNG, WebP up to 5MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-walmart-blue text-base font-medium text-white hover:bg-walmart-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-walmart-blue sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {selectedProduct ? 'Update Product' : 'Add Product'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      resetProductForm();
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDashboard; 