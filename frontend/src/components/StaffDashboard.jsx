import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  CheckCircle, 
  Package, 
  Tag,
  Search,
  Eye,
  AlertCircle,
  BarChart3,
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt
} from 'lucide-react';
import { inventoryAPI, staffAPI, salesAPI } from '../services/api';
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [showBillPopup, setShowBillPopup] = useState(false);
  const [billData, setBillData] = useState(null);
  
  // Sales history state
  const [salesHistory, setSalesHistory] = useState([]);
  const [salesHistoryLoading, setSalesHistoryLoading] = useState(false);
  
  // Sales-related state
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  });

  // Debug cart state changes
  useEffect(() => {
    console.log('🛒 Cart state changed:', cart);
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
        console.log('🏪 Using storeId as string:', storeId);
      } else if (user.storeId?._id) {
        storeId = user.storeId._id;
        console.log('🏪 Extracted storeId from _id:', storeId);
      } else if (user.storeId?.id) {
        storeId = user.storeId.id;
        console.log('🏪 Extracted storeId from id:', storeId);
      } else {
        console.error('❌ No valid storeId found in user object');
        toast.error('Store ID not found. Please login again.');
        return;
      }
      
      console.log('🏪 Final storeId to send:', storeId);
      console.log('🏪 Final storeId type:', typeof storeId);
      
      if (!storeId || typeof storeId !== 'string') {
        console.error('❌ Invalid storeId extracted:', storeId);
        toast.error('Invalid store ID. Please login again.');
        return;
      }
      
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
      console.error('❌ Error fetching inventory:', error);
      toast.error('Error fetching inventory');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchSalesHistory = useCallback(async () => {
    try {
      setSalesHistoryLoading(true);
      console.log('📊 Fetching sales history for user:', user);
      
      // Extract storeId using the same logic as fetchInventory
      let storeId;
      if (typeof user.storeId === 'string') {
        storeId = user.storeId;
      } else if (user.storeId?._id) {
        storeId = user.storeId._id;
      } else if (user.storeId?.id) {
        storeId = user.storeId.id;
      } else {
        console.error('❌ No valid storeId found for sales history');
        toast.error('Store ID not found. Please login again.');
        return;
      }

      if (!user?.id) {
        console.error('❌ No user ID found for sales history');
        toast.error('User information not found');
        return;
      }

      const response = await salesAPI.getStoreSales(storeId, {
        staffId: user.id,
        limit: 50 // Get last 50 sales
      });
      console.log('📊 Sales history response:', response);
      
      if (response.success) {
        setSalesHistory(response.data.sales);
      } else {
        toast.error(response.message || 'Failed to fetch sales history');
      }
    } catch (error) {
      console.error('❌ Error fetching sales history:', error);
      toast.error('Failed to fetch sales history');
    } finally {
      setSalesHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInventory();
    debugCurrentUser();
    if (user?.staffType === 'cashier') {
      fetchSalesHistory();
    }
  }, [fetchInventory, fetchSalesHistory, user?.staffType]); // fetchInventory is defined with useCallback so it's stable

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

  // Sales functions
  const validateCartItem = (item) => {
    console.log('🔍 ======= CART ITEM VALIDATION DEBUG =======');
    console.log('🔍 Validating item:', item);
    console.log('🔍 Item structure:', {
      hasItem: !!item,
      hasProductId: !!item?.productId,
      productIdType: typeof item?.productId,
      productIdValue: item?.productId,
      hasProductIdId: !!item?.productId?._id,
      productIdIdValue: item?.productId?._id,
      hasName: !!item?.productId?.name,
      nameValue: item?.productId?.name,
      hasPrice: !!item?.productId?.price,
      priceValue: item?.productId?.price,
      quantity: item?.quantity
    });
    
    if (!item || !item.productId) {
      console.error('❌ Invalid item structure - missing productId');
      return false;
    }
    
    const productId = item.productId._id || item.productId.id;
    if (!productId) {
      console.error('❌ Invalid productId structure - missing _id or id');
      return false;
    }
    
    if (!item.productId.name || !item.productId.price) {
      console.error('❌ Invalid product data - missing name or price');
      return false;
    }
    
    console.log('✅ Cart item validation passed');
    return true;
  };

  const addToCart = (item) => {
    console.log('🛒 ======= ADD TO CART DEBUG =======');
    console.log('🛒 Adding item to cart:', item);
    console.log('🛒 Current cart before add:', cart);
    
    if (!validateCartItem(item)) {
      console.error('❌ Cannot add invalid item to cart');
      toast.error('Cannot add invalid item to cart');
      return;
    }
    
    if (item.quantity <= 0) {
      console.error('❌ Cannot add out of stock item');
      toast.error('Product is out of stock');
      return;
    }
    
    const productId = item.productId._id || item.productId.id;
    console.log('🛒 Using productId:', productId);
    
    const existingItem = cart.find(cartItem => {
      const cartProductId = cartItem.productId._id || cartItem.productId.id || cartItem.productId;
      console.log('🛒 Comparing:', cartProductId, 'with', productId);
      return cartProductId === productId;
    });
    
    if (existingItem) {
      console.log('🛒 Item exists in cart, updating quantity');
      if (existingItem.quantity >= item.quantity) {
        toast.error('Cannot add more items than available in stock');
        return;
      }
      setCart(cart.map(cartItem => {
        const cartProductId = cartItem.productId._id || cartItem.productId.id || cartItem.productId;
        if (cartProductId === productId) {
          return { ...cartItem, quantity: cartItem.quantity + 1 };
        }
        return cartItem;
      }));
    } else {
      console.log('🛒 Adding new item to cart');
      const newCartItem = {
        productId: item.productId,
        quantity: 1,
        price: item.productId.price,
        name: item.productId.name,
        image: item.productId.image,
        availableQuantity: item.quantity
      };
      console.log('🛒 New cart item:', newCartItem);
      setCart([...cart, newCartItem]);
    }
    
    toast.success('Item added to cart');
    console.log('🛒 Cart after add:', cart);
  };

  const updateCartQuantity = (productId, newQuantity) => {
    console.log('🛒 ======= UPDATE CART QUANTITY DEBUG =======');
    console.log('🛒 Updating quantity for productId:', productId, 'to:', newQuantity);
    console.log('🛒 Current cart:', cart);
    
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => {
      const itemProductId = item.productId._id || item.productId.id || item.productId;
      console.log('🛒 Comparing:', itemProductId, 'with:', productId);
      
      if (itemProductId === productId) {
        if (newQuantity > item.availableQuantity) {
          toast.error('Cannot add more items than available in stock');
          return item;
        }
        console.log('🛒 Updating item quantity from', item.quantity, 'to', newQuantity);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    console.log('🛒 ======= REMOVE FROM CART DEBUG =======');
    console.log('🛒 Removing productId:', productId);
    console.log('🛒 Current cart:', cart);
    
    setCart(cart.filter(item => {
      const itemProductId = item.productId._id || item.productId.id || item.productId;
      console.log('🛒 Comparing:', itemProductId, 'with:', productId);
      return itemProductId !== productId;
    }));
    
    console.log('🛒 Cart after removal:', cart);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const processSale = async () => {
    console.log('💰 ======= PROCESS SALE DEBUG =======');
    console.log('💰 Processing sale with cart:', cart);
    console.log('💰 Customer info:', customerInfo);
    
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    // Validate customer info
    if (!customerInfo.firstName || !customerInfo.lastName) {
      toast.error('Please provide customer name');
      return;
    }
    
    try {
      // Process cart items with proper productId handling
      const processedCart = cart.map(item => {
        const productId = item.productId._id || item.productId.id;
        console.log('💰 Processing cart item:', item);
        console.log('💰 Extracted productId:', productId);
        
        if (!productId) {
          console.error('❌ Invalid productId in cart item:', item);
          throw new Error('Invalid product ID in cart');
        }
        
        return {
          productId: productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name
        };
      });
      
      console.log('💰 Processed cart:', processedCart);
      
      const saleData = {
        cart: processedCart,
        customerInfo: customerInfo,
        totalAmount: getTotalAmount(),
        storeId: user.storeId._id || user.storeId.id || user.storeId,
        staffId: user._id || user.id
      };
      
      console.log('💰 Sale data to send:', saleData);
      
      const response = await salesAPI.processSale(saleData);
      console.log('💰 Sale response:', response);
      
      if (response.success) {
        toast.success('Sale processed successfully!');
        
        // Prepare bill data for popup
        const saleData = response.data.sale;
        const billInfo = {
          transactionId: saleData.transactionId,
          saleDate: new Date(saleData.saleDate),
          customerName: saleData.customerInfo?.name || 'Walk-in Customer',
          customerEmail: saleData.customerInfo?.email || '',
          customerPhone: saleData.customerInfo?.phone || '',
          items: saleData.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.totalPrice
          })),
          subtotal: saleData.subtotal,
          tax: saleData.tax || 0,
          totalAmount: saleData.totalAmount,
          paymentMethod: saleData.paymentMethod || 'Cash',
          cashierName: `${user.firstName} ${user.lastName}`,
          storeName: saleData.storeId?.name || 'Walmart Store'
        };
        
        setBillData(billInfo);
        setShowBillPopup(true);
        
        clearCart();
        // Refresh inventory and sales history
        fetchInventory();
        fetchSalesHistory();
      } else {
        toast.error(response.message || 'Failed to process sale');
      }
    } catch (error) {
      console.error('❌ Error processing sale:', error);
      toast.error('Error processing sale: ' + error.message);
    }
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: ''
    });
  };

  const addTestItem = () => {
    const testItem = {
      productId: {
        _id: 'test-id-' + Date.now(),
        name: 'Test Product',
        price: 10.99,
        category: 'Test',
        brand: 'Test Brand',
        image: null
      },
      quantity: 50,
      availableQuantity: 50
    };
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
    console.log('🎯 ProductCard showAddToCart:', showAddToCart);
    console.log('🎯 ProductCard item analysis:', {
      hasItem: !!item,
      hasProductId: !!item?.productId,
      productIdValue: item?.productId,
      hasProductIdId: !!item?.productId?._id,
      hasProductIdIdField: !!item?.productId?.id,
      productIdIdValue: item?.productId?._id || item?.productId?.id,
      hasName: !!item?.productId?.name,
      nameValue: item?.productId?.name,
      hasPrice: !!item?.productId?.price,
      priceValue: item?.productId?.price,
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
            
            {showAddToCart && (
              <button
                onClick={() => addToCart(item)}
                disabled={item.quantity === 0}
                className="bg-walmart-blue text-white px-3 py-1 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center text-sm"
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

  const BillPopup = () => {
    if (!showBillPopup || !billData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-walmart-blue text-white p-4 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Purchase Receipt</h2>
              <button
                onClick={() => setShowBillPopup(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Bill Content */}
          <div className="p-6">
            {/* Store Info */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">{billData.storeName}</h3>
              <p className="text-sm text-gray-600">Thank you for shopping with us!</p>
            </div>

            {/* Transaction Info */}
            <div className="border-t border-b border-gray-200 py-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Transaction ID:</span>
                  <p className="text-gray-600">{billData.transactionId}</p>
                </div>
                <div>
                  <span className="font-medium">Date:</span>
                  <p className="text-gray-600">{billData.saleDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="font-medium">Time:</span>
                  <p className="text-gray-600">{billData.saleDate.toLocaleTimeString()}</p>
                </div>
                <div>
                  <span className="font-medium">Cashier:</span>
                  <p className="text-gray-600">{billData.cashierName}</p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Customer Details</h4>
              <div className="text-sm text-gray-600">
                <p><span className="font-medium">Name:</span> {billData.customerName}</p>
                {billData.customerEmail && (
                  <p><span className="font-medium">Email:</span> {billData.customerEmail}</p>
                )}
                {billData.customerPhone && (
                  <p><span className="font-medium">Phone:</span> {billData.customerPhone}</p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Items Purchased</h4>
              <div className="space-y-2">
                {billData.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-gray-600">{item.quantity} × ${item.price.toFixed(2)}</p>
                    </div>
                    <div className="font-medium">
                      ${item.total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${billData.subtotal.toFixed(2)}</span>
                </div>
                {billData.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${billData.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${billData.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Payment Method:</span>
                  <span>{billData.paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Thank you for your purchase!
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Please keep this receipt for your records.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowBillPopup(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-walmart-blue text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Print
              </button>
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
              <>
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
                <button
                  onClick={() => setActiveTab('salesHistory')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'salesHistory'
                      ? 'border-walmart-blue text-walmart-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Receipt className="w-5 h-5 inline mr-2" />
                  Sales History
                </button>
              </>
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
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Select Products</h2>
                
                <div className="mb-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredInventory.map((item) => (
                    <ProductCard key={item._id} item={item} showAddToCart={true} />
                  ))}
                </div>
              </div>
            </div>

            {/* Shopping Cart */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Shopping Cart</h2>
                
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => {
                      const productId = item.productId._id || item.productId.id;
                      return (
                        <div key={productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-600">${item.price}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateCartQuantity(productId, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(productId, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeFromCart(productId)}
                              className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-bold">Total:</span>
                        <span className="text-lg font-bold text-walmart-blue">${getTotalAmount().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Info */}
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={customerInfo.firstName}
                      onChange={(e) => setCustomerInfo({...customerInfo, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={customerInfo.lastName}
                      onChange={(e) => setCustomerInfo({...customerInfo, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-walmart-blue focus:border-transparent"
                  />
                </div>

                {/* Action Buttons */}
                <div className="mt-6 space-y-2">
                  <button
                    onClick={processSale}
                    disabled={cart.length === 0 || !customerInfo.firstName || !customerInfo.lastName}
                    className="w-full bg-walmart-blue text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                  >
                    <Receipt className="w-5 h-5 mr-2" />
                    Process Sale
                  </button>
                  <button
                    onClick={clearCart}
                    className="w-full bg-gray-200 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                  >
                    Clear Cart
                  </button>
                  <button
                    onClick={addTestItem}
                    className="w-full bg-green-500 text-white py-2 px-6 rounded-lg hover:bg-green-600 transition-colors duration-200"
                  >
                    Add Test Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sales History Tab (Cashier Only) */}
        {activeTab === 'salesHistory' && user.staffType === 'cashier' && (
          <div>
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Sales History</h2>
                <p className="text-sm text-gray-600 mt-1">View all your completed sales transactions</p>
              </div>
              
              <div className="p-6">
                {salesHistoryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-walmart-blue"></div>
                    <span className="ml-2 text-gray-600">Loading sales history...</span>
                  </div>
                ) : salesHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No sales history found</p>
                    <p className="text-sm">Start making sales to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {salesHistory.map((sale) => (
                      <div key={sale._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium text-gray-900">Transaction #{sale.transactionId}</h3>
                            <p className="text-sm text-gray-600">
                              {new Date(sale.saleDate).toLocaleDateString()} at {new Date(sale.saleDate).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">${sale.totalAmount.toFixed(2)}</p>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {sale.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Customer:</span> {sale.customerInfo?.name || 'Walk-in Customer'}
                          </p>
                          {sale.customerInfo?.email && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Email:</span> {sale.customerInfo.email}
                            </p>
                          )}
                          {sale.customerInfo?.phone && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Phone:</span> {sale.customerInfo.phone}
                            </p>
                          )}
                        </div>
                        
                        <div className="border-t border-gray-200 pt-3">
                          <h4 className="font-medium text-gray-900 mb-2">Items ({sale.items.length})</h4>
                          <div className="space-y-1">
                            {sale.items.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="text-gray-900">${item.totalPrice.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Payment:</span> {sale.paymentMethod || 'Cash'}
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              Total: ${sale.totalAmount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
      {showBillPopup && <BillPopup />}
    </div>
  );
};

export default StaffDashboard; 