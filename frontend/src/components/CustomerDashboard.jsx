import React, { useState, useEffect } from 'react';
import { 
  Store, 
  ShoppingCart, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Plus, 
  Minus, 
  Receipt, 
  Download,
  User,
  LogOut,
  Package,
  Phone,
  Star,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  AlertCircle,
  X,
  Mail,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { customerAPI } from '../services/api';
import ChatBot from './ChatBot';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const [selectedStore, setSelectedStore] = useState(null);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, store-selection, products, cart, orders, account
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [storeInventoryCounts, setStoreInventoryCounts] = useState({});
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Toggle chat
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Load stores on component mount
  useEffect(() => {
    loadStores();
  }, []);

  // Load products when store is selected
  useEffect(() => {
    if (selectedStore && currentView === 'products') {
      loadProducts();
    }
  }, [selectedStore, currentView, searchTerm, selectedCategory, sortBy, currentPage]);

  // Load orders when orders view or dashboard is selected
  useEffect(() => {
    if (currentView === 'orders' || currentView === 'dashboard') {
      loadOrders();
    }
  }, [currentView]);

  // Load stores
  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getStores();
      if (response.success) {
        setStores(response.data);
        // Load inventory counts for all stores
        loadStoreInventoryCounts(response.data);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      alert('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  // Load inventory counts for all stores
  const loadStoreInventoryCounts = async (storeList) => {
    const counts = {};
    for (const store of storeList) {
      try {
        const response = await customerAPI.getStoreInventory(store._id || store.id);
        if (response.success) {
          counts[store._id || store.id] = response.data.inventory.length;
        } else {
          counts[store._id || store.id] = 0;
        }
      } catch (error) {
        console.error(`Error loading inventory for store ${store.storeCode}:`, error);
        counts[store._id || store.id] = 0;
      }
    }
    setStoreInventoryCounts(counts);
  };

  // Load products for selected store
  const loadProducts = async () => {
    if (!selectedStore) return;
    try {
      setLoading(true);
      
      // Debug: Log the selectedStore object
      console.log('🏪 Selected store object:', selectedStore);
      console.log('🏪 Selected store._id:', selectedStore._id);
      console.log('🏪 Selected store.id:', selectedStore.id);
      
      // Extract store ID properly
      const storeId = selectedStore._id || selectedStore.id;
      console.log('🏪 Extracted storeId:', storeId);
      
      if (!storeId) {
        console.error('❌ No valid store ID found');
        alert('Invalid store selected. Please select a store again.');
        return;
      }
      
      const response = await customerAPI.getStoreInventory(storeId);
      console.log('📦 Inventory response:', response);
      
      if (response.success) {
        // Map inventory to product objects with stock count
        const inventoryProducts = response.data.inventory.map(item => ({
          ...item.productId,
          stock: item.quantity
        }));
        console.log('📦 Processed inventory products:', inventoryProducts);
        
        if (inventoryProducts.length === 0) {
          console.log('📦 No inventory found for this store');
          setProducts([]);
          alert(`No products available in ${selectedStore.name} (${selectedStore.storeCode}). Please try another store.`);
        } else {
          setProducts(inventoryProducts);
        }
        
        // Optionally, extract categories from products
        const uniqueCategories = Array.from(new Set(inventoryProducts.map(p => p.category).filter(Boolean)));
        setCategories(uniqueCategories);
        setTotalPages(1); // No pagination for now
      } else {
        console.error('❌ Failed to load inventory:', response.message);
        alert('Failed to load products: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Failed to load products: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Load customer orders
  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getOrders();
      if (response.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Select store
  const handleStoreSelect = (store) => {
    console.log('🏪 Store selected:', store);
    console.log('🏪 Store keys:', Object.keys(store));
    console.log('🏪 Store._id:', store._id);
    console.log('🏪 Store.id:', store.id);
    
    setSelectedStore(store);
    setCurrentView('products');
    setCurrentPage(1);
    setSearchTerm('');
    setSelectedCategory('all');
    setSortBy('name');
  };

  // Add to cart
  const addToCart = (product) => {
    const existingItem = cart.find(item => (item._id || item.id) === (product._id || product.id));
    if (existingItem) {
      setCart(cart.map(item =>
        (item._id || item.id) === (product._id || product.id)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    alert(`${product.name} added to cart`);
  };

  // Update cart quantity
  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      (item._id || item.id) === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => (item._id || item.id) !== productId));
  };

  // Calculate cart total
  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Place order
  const placeOrder = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      setLoading(true);
      const orderData = {
        storeId: selectedStore._id || selectedStore.id,
        items: cart.map(item => ({
          productId: item._id || item.id,
          quantity: item.quantity
        })),
        customerInfo: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone || ''
        },
        paymentMethod: 'cash'
      };

      const response = await customerAPI.createOrder(orderData);
      if (response.success) {
        setOrderSuccess(response.data);
        setCart([]);
        setShowCheckout(false);
        
        // Show success message with receipt display option
        const showReceipt = window.confirm(
          `Order placed successfully!\n\nTransaction ID: ${response.data.transactionId}\nTotal Amount: $${response.data.totalAmount}\n\nWould you like to view the receipt?`
        );
        
        if (showReceipt) {
          try {
            await displayReceipt(response.data.sale._id || response.data.sale.id);
          } catch (error) {
            console.error('Error displaying receipt:', error);
            alert('Receipt display failed, but order was placed successfully!');
          }
        }
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // Display receipt
  const displayReceipt = async (saleId) => {
    try {
      const response = await customerAPI.downloadReceipt(saleId, 'pdf');
      
      // Create blob URL for display
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      
      setReceiptData({
        url,
        saleId,
        blob
      });
      setShowReceipt(true);
    } catch (error) {
      console.error('Error displaying receipt:', error);
      alert('Failed to display receipt');
    }
  };

  // Download receipt (for manual download option)
  const downloadReceipt = async (saleId, format = 'pdf') => {
    try {
      const response = await customerAPI.downloadReceipt(saleId, format);
      
      // Create blob URL and download
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `receipt.${format}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt');
    }
  };

  // Update profile
  const updateProfile = async () => {
    try {
      setLoading(true);
      // This would call the API to update profile
      // const response = await customerAPI.updateProfile(profileData);
      alert('Profile updated successfully!');
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Render dashboard overview
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {user.firstName}!</h2>
        <p className="text-blue-100">Ready to start shopping? Select a store below or browse your recent orders.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Available Stores</p>
              <p className="text-2xl font-bold text-gray-900">{stores.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Items in Cart</p>
              <p className="text-2xl font-bold text-gray-900">{cart.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Store Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a Store to Start Shopping</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            stores.slice(0, 6).map((store) => {
              const inventoryCount = storeInventoryCounts[store._id || store.id] || 0;
              return (
                <div
                  key={store._id}
                  onClick={() => handleStoreSelect(store)}
                  className={`border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all ${
                    inventoryCount === 0 ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <Store className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="font-medium text-gray-900">{store.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{store.storeCode}</p>
                  <p className="text-xs text-gray-500 mb-2">{store.address}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      inventoryCount > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {inventoryCount > 0 ? `${inventoryCount} products` : 'No inventory'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {stores.length > 6 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setCurrentView('store-selection')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All {stores.length} Stores →
            </button>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      {orders.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
            <button
              onClick={() => setCurrentView('orders')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 3).map((order) => (
              <div key={order._id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Order #{order.transactionId}</p>
                  <p className="text-sm text-gray-600">{new Date(order.saleDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">${order.totalAmount.toFixed(2)}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    order.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render account settings
  const renderAccountSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
      
      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
          <button
            onClick={() => setEditingProfile(!editingProfile)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {editingProfile ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
        
        {editingProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={updateProfile}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center">
              <User className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-gray-600">Full Name</p>
              </div>
            </div>
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">{user.email}</p>
                <p className="text-sm text-gray-600">Email Address</p>
              </div>
            </div>
            <div className="flex items-center">
              <Phone className="w-5 h-5 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">{user.phone || 'Not provided'}</p>
                <p className="text-sm text-gray-600">Phone Number</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Statistics */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">Member Since</p>
            <p className="font-medium text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="font-medium text-gray-900">{orders.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Account Status</p>
            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              Active
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Customer Type</p>
            <p className="font-medium text-gray-900">Regular Customer</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render store selection
  const renderStoreSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Store</h2>
        <p className="text-gray-600">Choose a Walmart location to start shopping</p>
      </div>
      
      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => {
            const inventoryCount = storeInventoryCounts[store._id || store.id] || 0;
            return (
            <div
                key={store._id || store.id}
              onClick={() => handleStoreSelect(store)}
                className={`bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500 ${
                  inventoryCount === 0 ? 'opacity-60' : ''
                }`}
            >
              <div className="flex items-center mb-4">
                <Store className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
                  <p className="text-sm text-gray-600">{store.storeCode}</p>
                </div>
              </div>
              <p className="text-gray-700 mb-2">{store.address}</p>
                <p className="text-gray-600 mb-3">{store.phone}</p>
                <div className="flex justify-between items-center">
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    inventoryCount > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {inventoryCount > 0 ? `${inventoryCount} products available` : 'No inventory'}
                  </span>
            </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render products
  const renderProducts = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{selectedStore?.name}</h2>
          <p className="text-gray-600">Browse products and add to cart</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <button
            onClick={() => setCurrentView('store-selection')}
            className="text-blue-600 hover:text-blue-800"
          >
            Change Store
          </button>
          <button
            onClick={() => setCurrentView('cart')}
            className="relative bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Cart ({cart.length})
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest</option>
            </select>

            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid/List */}
      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
        }>
          {products.map((product) => (
            <div
              key={product._id || product.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
                viewMode === 'list' ? 'flex' : ''
              }`}
            >
              {/* Product Image */}
              <div className={`${viewMode === 'list' ? 'w-48 h-32' : 'h-48'} bg-gray-200 flex items-center justify-center`}>
                {product.image?.url ? (
                  <img
                    src={product.image.url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="h-12 w-12 text-gray-400" />
                )}
              </div>

              {/* Product Details */}
              <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-green-600">${product.price}</span>
                  <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{product.category}</span>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      product.stock === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  // Render cart
  const renderCart = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Shopping Cart</h2>
        <button
          onClick={() => setCurrentView('products')}
          className="text-blue-600 hover:text-blue-800"
        >
          Continue Shopping
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
          <p className="text-gray-600">Add some products to get started</p>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="bg-white rounded-lg shadow-sm divide-y">
            {cart.map((item) => (
              <div key={item.id} className="p-6 flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  {item.image?.url ? (
                    <img
                      src={item.image.url}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-gray-600">${item.price} each</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-lg font-semibold text-gray-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>

                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-semibold">Total:</span>
              <span className="text-2xl font-bold text-green-600">${getCartTotal().toFixed(2)}</span>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Render orders
  const renderOrders = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600">Your order history will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order.transactionId}
                    </h3>
                    <p className="text-gray-600">
                      {new Date(order.saleDate).toLocaleDateString()}
                    </p>
                    <p className="text-gray-600">{order.storeId.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${order.totalAmount.toFixed(2)}
                    </p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Items:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name} x {item.quantity}</span>
                        <span>${item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => downloadReceipt(order._id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Receipt
                  </button>
                </div>
              </div>
            ))}
                  </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 h-5/6 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Receipt</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => downloadReceipt(receiptData.saleId)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </button>
                <button
                  onClick={() => {
                    setShowReceipt(false);
                    setReceiptData(null);
                    if (receiptData.url) {
                      window.URL.revokeObjectURL(receiptData.url);
                    }
                  }}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            
            {/* PDF Viewer */}
            <div className="flex-1 p-4">
              <iframe
                src={receiptData.url}
                className="w-full h-full border rounded"
                title="Receipt PDF"
              />
            </div>
          </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Walmart Customer Portal</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-4 py-2 rounded-lg ${
                    currentView === 'dashboard' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('store-selection')}
                  className={`px-4 py-2 rounded-lg ${
                    currentView === 'store-selection' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Stores
                </button>
                {selectedStore && (
                  <button
                    onClick={() => setCurrentView('products')}
                    className={`px-4 py-2 rounded-lg ${
                      currentView === 'products' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    Products
                  </button>
                )}
                <button
                  onClick={() => setCurrentView('cart')}
                  className={`px-4 py-2 rounded-lg relative ${
                    currentView === 'cart' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Cart
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                      {cart.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setCurrentView('orders')}
                  className={`px-4 py-2 rounded-lg ${
                    currentView === 'orders' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setCurrentView('account')}
                  className={`px-4 py-2 rounded-lg ${
                    currentView === 'account' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Account
                </button>
              </nav>
              
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700">{user.firstName} {user.lastName}</span>
                <button
                  onClick={logout}
                  className="text-gray-600 hover:text-red-600"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'store-selection' && renderStoreSelection()}
        {currentView === 'products' && renderProducts()}
        {currentView === 'cart' && renderCart()}
        {currentView === 'orders' && renderOrders()}
        {currentView === 'account' && renderAccountSettings()}
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Checkout</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store
                </label>
                <p className="text-gray-900">{selectedStore?.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Items
                </label>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name} x {item.quantity}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>${getCartTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={placeOrder}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Order Successful!</h3>
              <p className="text-gray-600 mb-4">
                Your order #{orderSuccess.transactionId} has been placed successfully.
              </p>
              <p className="text-2xl font-bold text-green-600 mb-6">
                Total: ${orderSuccess.totalAmount.toFixed(2)}
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => displayReceipt(orderSuccess.sale._id || orderSuccess.sale.id)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  View Receipt
                </button>
                <button
                  onClick={() => downloadReceipt(orderSuccess.sale._id || orderSuccess.sale.id)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </button>
                <button
                  onClick={() => {
                    setOrderSuccess(null);
                    setCurrentView('orders');
                  }}
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  View All Orders
                </button>
                <button
                  onClick={() => {
                    setOrderSuccess(null);
                    setCurrentView('products');
                  }}
                  className="w-full text-blue-600 hover:text-blue-800"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      {!isChatOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-40"
          title="Chat with Walmart Assistant"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* ChatBot Component */}
      <ChatBot 
        isOpen={isChatOpen} 
        onToggle={toggleChat} 
        user={user} 
      />
    </div>
  );
};

export default CustomerDashboard; 