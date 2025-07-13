import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  CheckCircle, 
  Package, 
  ShoppingCart,
  Tag,
  Search,
  Eye,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  BarChart3,
  X,
  Receipt
} from 'lucide-react';
import { inventoryAPI, salesAPI, staffAPI } from '../services/api';
import toast from 'react-hot-toast';
import StaffAttendanceCalendar from './StaffAttendanceCalendar';
import StaffPerformanceInsights from './StaffPerformanceInsights';

const StaffDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  
  // Add debugging for cart state changes
  useEffect(() => {
    console.log('🛒 Cart state changed:', cart);
    console.log('🛒 Cart analysis:', cart.map((item, index) => ({
      index,
      productId: item.productId,
      productIdType: typeof item.productId,
      hasProductId: !!item.productId,
      hasValidProductId: !!item.productId && typeof item.productId === 'string',
      name: item.name,
      price: item.price,
      quantity: item.quantity
    })));
  }, [cart]);

  // Define fetchInventory as a stable function to avoid dependency issues
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      
      // Enhanced debugging for storeId extraction
      console.log('🏪 ======= STORE ID EXTRACTION DEBUG =======');
      console.log('🏪 user object:', user);
      console.log('🏪 user.storeId type:', typeof user.storeId);
      console.log('🏪 user.storeId value:', user.storeId);
      console.log('🏪 user.storeId._id:', user.storeId?._id);
      console.log('🏪 user.storeId.id:', user.storeId?.id);
      console.log('🏪 user.storeId stringified:', JSON.stringify(user.storeId));
      
      // Fix: Properly extract the storeId string
      let storeId;
      if (typeof user.storeId === 'string') {
        storeId = user.storeId;
      } else if (user.storeId?._id) {
        storeId = user.storeId._id;
      } else if (user.storeId?.id) {
        storeId = user.storeId.id;
      } else {
        console.error('❌ No valid storeId found in user object');
        toast.error('Store ID not found. Please login again.');
        return;
      }
      
      console.log('🏪 Final extracted storeId:', storeId);
      console.log('🏪 Final storeId type:', typeof storeId);
      
      const response = await inventoryAPI.getStoreInventory(storeId);
      console.log('📦 ======= INVENTORY API RESPONSE =======');
      console.log('📦 Response received:', response);
      
      if (response.success) {
        setInventory(response.data.inventory);
        console.log('📦 Inventory set successfully:', response.data.inventory);
        console.log('📦 First inventory item:', response.data.inventory[0]);
      } else {
        console.error('❌ Failed to fetch inventory:', response.message);
        toast.error('Failed to fetch inventory');
      }
    } catch (error) {
      console.error('❌ Inventory fetch error:', error);
      toast.error('Error fetching inventory');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInventory();
    debugCurrentUser();
  }, [fetchInventory]); // fetchInventory is defined with useCallback so it's stable

  // Filter inventory based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = inventory.filter(item =>
        item.productId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productId.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productId.brand.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInventory(filtered);
    } else {
      setFilteredInventory(inventory);
    }
  }, [inventory, searchTerm]);

  const debugCurrentUser = async () => {
    try {
      const response = await staffAPI.debugWhoAmI();
      console.log('🔍 Current user debug:', response);
    } catch (error) {
      console.error('❌ Debug user error:', error);
    }
  };



  const openProductDetails = (item) => {
    setSelectedProduct(item);
    setShowProductDetails(true);
  };

  const closeProductDetails = () => {
    setSelectedProduct(null);
    setShowProductDetails(false);
  };

  // Validate cart item structure
  const validateCartItem = (cartItem) => {
    const isValid = cartItem && 
      cartItem.productId && 
      typeof cartItem.productId === 'string' &&
      cartItem.name && 
      cartItem.price && 
      typeof cartItem.price === 'number' &&
      cartItem.quantity && 
      typeof cartItem.quantity === 'number';
    
    if (!isValid) {
      console.error('❌ Invalid cart item structure:', cartItem);
    }
    
    return isValid;
  };

  const addToCart = (item) => {
    console.log('🛒 ======= ADD TO CART FUNCTION =======');
    console.log('🛒 addToCart called with item:', item);
    console.log('🛒 Item validation details:', {
      hasItem: !!item,
      hasProductId: !!item?.productId,
      hasProductIdId: !!item?.productId?._id,
      productIdValue: item?.productId?._id,
      productIdType: typeof item?.productId?._id,
      hasName: !!item?.productId?.name,
      hasPrice: !!item?.productId?.price,
      priceType: typeof item?.productId?.price,
      nameValue: item?.productId?.name,
      priceValue: item?.productId?.price,
      fullItem: item
    });
    
    // Detailed validation with specific error messages
    if (!item) {
      console.error('❌ Item is null or undefined');
      toast.error('Invalid product data - item is null');
      return;
    }
    
    if (!item.productId) {
      console.error('❌ Item has no productId property:', item);
      toast.error('Invalid product data - missing productId');
      return;
    }
    
    if (!item.productId._id) {
      console.error('❌ Item productId has no _id property:', item.productId);
      toast.error('Invalid product data - missing productId._id');
      return;
    }
    
    if (!item.productId.name) {
      console.error('❌ Item productId has no name property:', item.productId);
      toast.error('Invalid product data - missing product name');
      return;
    }
    
    if (typeof item.productId.price !== 'number') {
      console.error('❌ Item productId has invalid price:', item.productId.price);
      toast.error('Invalid product data - invalid price');
      return;
    }

    console.log('✅ Item validation passed - proceeding with cart addition');
    
    // Extract the productId string for cart storage
    const productId = item.productId._id;
    console.log('🔑 Extracted productId for cart:', productId);
    console.log('🔑 ProductId type:', typeof productId);
    
    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(cartItem => cartItem.productId === productId);
    console.log('🔍 Existing item check:', {
      existingItemIndex,
      cartLength: cart.length,
      searchingFor: productId
    });
    
    if (existingItemIndex !== -1) {
      console.log('📝 Updating existing cart item quantity');
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += 1;
      setCart(updatedCart);
      toast.success(`Updated ${item.productId.name} quantity to ${updatedCart[existingItemIndex].quantity}`);
    } else {
      console.log('➕ Adding new item to cart');
      const cartItem = {
        productId: productId, // Store the ID string for backend compatibility
        name: item.productId.name,
        price: item.productId.price,
        quantity: 1,
        // Store additional data for display purposes
        category: item.productId.category,
        brand: item.productId.brand,
        image: item.productId.image
      };
      
      console.log('🛒 New cart item created:', cartItem);
      console.log('🛒 Cart item productId type:', typeof cartItem.productId);
      
      setCart(prevCart => {
        const newCart = [...prevCart, cartItem];
        console.log('🛒 New cart state:', newCart);
        return newCart;
      });
      
      toast.success(`Added ${item.productId.name} to cart`);
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const updatedCart = cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    );
    setCart(updatedCart);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const processSale = async () => {
    try {
      if (cart.length === 0) {
        toast.error('Cart is empty');
        return;
      }

      console.log('🛒 Cart before processing sale:', cart);
      console.log('🛒 Cart length:', cart.length);
      console.log('👤 User object:', user);
      console.log('🏪 User storeId:', user.storeId);
      console.log('🏪 StoreId extraction:', {
        '_id': user.storeId?._id,
        'id': user.storeId?.id,
        'direct': user.storeId,
        'final': user.storeId?._id || user.storeId?.id || user.storeId
      });

      // Fix: Properly extract the storeId string
      let storeId;
      if (typeof user.storeId === 'string') {
        storeId = user.storeId;
      } else if (user.storeId?._id) {
        storeId = user.storeId._id;
      } else if (user.storeId?.id) {
        storeId = user.storeId.id;
      } else {
        console.error('❌ No valid storeId found in user object');
        toast.error('Store ID not found. Please login again.');
        return;
      }
      
      console.log('🏪 Final extracted storeId for sale:', storeId);
      console.log('🏪 Final storeId type for sale:', typeof storeId);

      // Comprehensive cart validation before processing
      console.log('🔍 Validating each cart item...');
      const invalidItems = cart.filter((item, index) => {
        const isValid = validateCartItem(item);
        console.log(`🔍 Cart item ${index + 1} validation:`, {
          item: item,
          isValid: isValid,
          hasProductId: !!item.productId,
          productIdType: typeof item.productId,
          productIdValue: item.productId,
          hasQuantity: !!item.quantity,
          hasPrice: !!item.price
        });
        return !isValid;
      });
      
      if (invalidItems.length > 0) {
        console.error('❌ Invalid cart items found:', invalidItems);
        toast.error('Invalid cart items - please refresh and try again');
        return;
      }

      const saleData = {
        items: cart.map((item, index) => {
          console.log(`📦 Processing cart item ${index + 1}:`, {
            productId: item.productId,
            productIdType: typeof item.productId,
            hasProductId: !!item.productId,
            quantity: item.quantity,
            price: item.price,
            fullItem: item
          });
          
          if (!item.productId) {
            console.error(`❌ Cart item ${index + 1} has undefined productId:`, item);
            throw new Error(`Cart item ${index + 1} has undefined productId`);
          }
          
          return {
            productId: item.productId, // This is the ID string
            quantity: item.quantity,
            price: item.price
          };
        }),
        totalAmount: getTotalAmount(),
        paymentMethod: 'cash',
        customerName: customerInfo.name || 'Walk-in Customer',
        customerEmail: customerInfo.email || null,
        customerPhone: customerInfo.phone || null,
        cashierId: user.id,
        storeId: storeId // Use the properly extracted storeId
      };

      console.log('💰 Final sale data being sent:', JSON.stringify(saleData, null, 2));
      console.log('💰 Processing sale with validated data:', saleData);
      
      const response = await salesAPI.createSale(saleData);
      console.log('💰 Sale response:', response);
      
      if (response.success) {
        clearCart();
        toast.success('Sale processed successfully!');
        
        // Refresh inventory after sale
        await fetchInventory();
      } else {
        toast.error(response.message || 'Failed to process sale');
      }
    } catch (error) {
      console.error('❌ Sale processing error:', error);
      console.error('❌ Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Error processing sale');
    }
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({ name: '', email: '', phone: '' });
  };

  const addTestItem = () => {
    const testItem = {
      productId: {
        _id: '68740ba1eafcd77f2f057d60',
        name: 'Test Product',
        price: 50,
        category: 'Test',
        brand: 'Test Brand'
      },
      quantity: 10
    };
    console.log('🧪 Adding test item:', testItem);
    addToCart(testItem);
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { status: 'Out of Stock', color: 'text-red-600', icon: AlertCircle };
    if (quantity < 10) return { status: 'Low Stock', color: 'text-yellow-600', icon: AlertCircle };
    return { status: 'In Stock', color: 'text-green-600', icon: CheckCircle };
  };

  const ProductCard = ({ item, showAddToCart = false }) => {
    console.log('🎯 ======= PRODUCTCARD COMPONENT DEBUG =======');
    console.log('🎯 ProductCard received item:', item);
    console.log('🎯 ProductCard item analysis:', {
      hasItem: !!item,
      hasProductId: !!item?.productId,
      productIdValue: item?.productId,
      hasProductIdId: !!item?.productId?._id,
      productIdIdValue: item?.productId?._id,
      hasName: !!item?.productId?.name,
      nameValue: item?.productId?.name,
      hasPrice: !!item?.productId?.price,
      priceValue: item?.productId?.price,
      showAddToCart: showAddToCart,
      quantity: item?.quantity
    });
    
    const stockInfo = getStockStatus(item.quantity);
    const StockIcon = stockInfo.icon;

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
        {/* Product Image */}
        <div className="relative h-48 bg-gray-100">
          {item.productId.image?.url ? (
            <img
              src={item.productId.image.url}
              alt={item.productId.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center" style={{ display: item.productId.image?.url ? 'none' : 'flex' }}>
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{item.productId.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{item.productId.category} • {item.productId.brand}</p>
              <div className="flex items-center space-x-2">
                <StockIcon className={`w-4 h-4 ${stockInfo.color}`} />
                <span className={`text-sm font-medium ${stockInfo.color}`}>
                  {stockInfo.status} ({item.quantity})
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">${item.productId.price}</p>
            </div>
          </div>
          
        <div className="flex justify-between items-center">
            <button
              onClick={() => openProductDetails(item)}
            className="flex items-center text-walmart-blue hover:text-blue-600 text-sm font-medium"
            >
            <Eye className="w-4 h-4 mr-1" />
              View Details
            </button>
            
          {showAddToCart && item.quantity > 0 && (
              <button
                onClick={() => {
                  console.log('🔥 ======= ADD TO CART BUTTON CLICKED =======');
                  console.log('🔥 Button click - item being passed to addToCart:', item);
                  console.log('🔥 Button click - item analysis:', {
                    hasItem: !!item,
                    hasProductId: !!item?.productId,
                    productIdType: typeof item?.productId,
                    productIdValue: item?.productId,
                    hasProductIdId: !!item?.productId?._id,
                    productIdIdType: typeof item?.productId?._id,
                    productIdIdValue: item?.productId?._id,
                    stringifiedItem: JSON.stringify(item, null, 2)
                  });
                  console.log('🔥 About to call addToCart with item:', item);
                  addToCart(item);
                }}
              className="bg-walmart-blue text-white px-3 py-1 rounded-md hover:bg-blue-600 flex items-center text-sm"
              >
              <Plus className="w-4 h-4 mr-1" />
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ProductDetailsModal = () => {
    if (!selectedProduct) return null;

    const stockInfo = getStockStatus(selectedProduct.quantity);
    const StockIcon = stockInfo.icon;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
            <button
              onClick={closeProductDetails}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
                  {selectedProduct.productId.image?.url ? (
                    <img
                      src={selectedProduct.productId.image.url}
                      alt={selectedProduct.productId.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-400" />
                  </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedProduct.productId.name}</h3>
                  <div className="flex items-center space-x-2 mb-4">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{selectedProduct.productId.category}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{selectedProduct.productId.brand}</span>
                </div>
                  </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Price</span>
                    <span className="text-2xl font-bold text-gray-900">${selectedProduct.productId.price}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Availability</span>
                    <div className="flex items-center space-x-2">
                      <StockIcon className={`w-4 h-4 ${stockInfo.color}`} />
                      <span className={`text-sm font-medium ${stockInfo.color}`}>
                        {stockInfo.status} ({selectedProduct.quantity})
                      </span>
                  </div>
                  </div>
                </div>

                {user.staffType === 'cashier' && (
                  <div className="pt-4">
                    <button
                      onClick={() => addToCart(selectedProduct)}
                      disabled={selectedProduct.quantity === 0}
                      className="w-full bg-walmart-blue text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add to Cart
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-walmart-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
              <p className="text-sm text-gray-600">
                {user.firstName} {user.lastName} - {user.staffType} at {user.storeId.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-walmart-blue text-white px-3 py-1 rounded-full text-sm font-medium">
                {user.staffType}
              </div>
              <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                {user.storeId.storeCode}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'inventory'
                  ? 'border-walmart-blue text-walmart-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Inventory
            </button>
            {user.staffType === 'cashier' && (
              <button
                onClick={() => setActiveTab('sales')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sales'
                    ? 'border-walmart-blue text-walmart-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <ShoppingCart className="w-5 h-5 inline mr-2" />
                Sales
              </button>
            )}
            <button
              onClick={() => setActiveTab('attendance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'attendance'
                  ? 'border-walmart-blue text-walmart-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="w-5 h-5 inline mr-2" />
              My Attendance
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-walmart-blue text-walmart-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-5 h-5 inline mr-2" />
              My Performance
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredInventory.map((item) => {
                console.log('📦 ======= INVENTORY ITEM RENDERING DEBUG =======');
                console.log('📦 Raw item from filteredInventory:', item);
                console.log('📦 Item structure analysis:', {
                  itemId: item._id,
                  itemIdType: typeof item._id,
                  hasItem: !!item,
                  hasProductId: !!item.productId,
                  productIdType: typeof item.productId,
                  productIdValue: item.productId,
                  hasProductIdId: !!item.productId?._id,
                  productIdIdType: typeof item.productId?._id,
                  productIdIdValue: item.productId?._id,
                  hasName: !!item.productId?.name,
                  nameValue: item.productId?.name,
                  hasPrice: !!item.productId?.price,
                  priceValue: item.productId?.price,
                  fullItem: item
                });
                console.log('📦 About to render ProductCard with item:', item);
                return (
                  <ProductCard key={item._id} item={item} />
                );
              })}
            </div>

            {filteredInventory.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No products found</p>
              </div>
            )}
          </div>
        )}

        {/* Sales Tab (Cashier Only) */}
        {activeTab === 'sales' && user.staffType === 'cashier' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Product Grid */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search products to add to cart..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {console.log('📦 ======= INVENTORY RENDERING DEBUG =======') || true}
                {console.log('📦 Raw inventory array:', inventory) || true}
                {console.log('📦 Raw filteredInventory array:', filteredInventory) || true}
                {console.log('📦 First filtered item:', filteredInventory[0]) || true}
                {console.log('📦 First filtered item stringified:', JSON.stringify(filteredInventory[0], null, 2)) || true}
                {filteredInventory.map((item) => {
                  console.log('💰 ======= CASHIER TAB ITEM RENDERING =======');
                  console.log('💰 Cashier tab - rendering item:', item);
                  console.log('💰 Cashier tab - item structure:', {
                    hasItem: !!item,
                    hasProductId: !!item?.productId,
                    productIdValue: item?.productId,
                    hasProductIdId: !!item?.productId?._id,
                    productIdIdValue: item?.productId?._id,
                    showAddToCart: true,
                    jsonString: JSON.stringify(item, null, 2)
                  });
                  return (
                    <ProductCard key={item._id} item={item} showAddToCart={true} />
                  );
                })}
              </div>
            </div>

            {/* Shopping Cart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Shopping Cart ({cart.length})
              </h3>

              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-gray-600">${item.price} each</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.availableQuantity}
                          className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-xl font-bold text-walmart-blue">
                    ${getTotalAmount().toFixed(2)}
                  </span>
                </div>
                
                    <div className="space-y-3 mb-4">
                      <input
                        type="text"
                        placeholder="Customer Name (Optional)"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                      <input
                        type="email"
                        placeholder="Customer Email (Optional)"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>

                  <button
                    onClick={() => {
                      console.log('🎯 About to process sale - Cart contents:', cart);
                      console.log('🎯 Cart item analysis:', cart.map((item, index) => ({
                        index,
                        productId: item.productId,
                        productIdType: typeof item.productId,
                        hasProductId: !!item.productId,
                        fullItem: item
                      })));
                      processSale();
                    }}
                      className="w-full bg-walmart-blue text-white py-3 rounded-lg hover:bg-blue-600 flex items-center justify-center font-medium"
                  >
                    <Receipt className="w-5 h-5 mr-2" />
                    Process Sale
                  </button>
                  
                  <button
                    onClick={addTestItem}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center font-medium mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Test Item
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div>
            <StaffAttendanceCalendar />
          </div>
        )}
              
        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div>
            <StaffPerformanceInsights />
          </div>
        )}
              </div>

      {showProductDetails && selectedProduct && <ProductDetailsModal />}
    </div>
  );
};

export default StaffDashboard; 