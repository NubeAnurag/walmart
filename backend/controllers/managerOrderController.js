const ManagerOrder = require('../models/ManagerOrder');
const Product = require('../models/Product');
const User = require('../models/User');
const Store = require('../models/Store');

// Get all products from suppliers assigned to manager's store
const getSupplierProducts = async (req, res) => {
  try {
    const { supplierId, category, search, minPrice, maxPrice, sort = 'name' } = req.query;
    const managerId = req.user.id;

    console.log('🔍 getSupplierProducts Debug:');
    console.log('Manager ID:', managerId);
    console.log('Supplier ID:', supplierId);
    console.log('Category:', category);
    console.log('Search:', search);

    // Get manager's store
    const manager = await User.findById(managerId).populate('storeId');
    if (!manager || !manager.storeId) {
      return res.status(404).json({ message: 'Manager store not found' });
    }

    const storeId = manager.storeId._id;
    console.log('Store ID:', storeId);

    // Build query for products
    const query = {
      isActive: true,
      storeIds: storeId
    };

    // Filter by supplier if provided
    if (supplierId) {
      query.supplierId = supplierId;
    }

    // Filter by category if provided
    if (category && category !== 'all') {
      query.category = category;
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'price_asc':
        sortOption = { price: 1 };
        break;
      case 'price_desc':
        sortOption = { price: -1 };
        break;
      case 'name':
        sortOption = { name: 1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      default:
        sortOption = { name: 1 };
    }

    const products = await Product.find(query)
      .populate('supplierId', 'firstName lastName email companyName')
      .sort(sortOption)
      .lean();

    console.log(`📦 Found ${products.length} products for store ${storeId}`);

    res.json({
      success: true,
      data: products,
      count: products.length
    });

  } catch (error) {
    console.error('❌ Error in getSupplierProducts:', error);
    res.status(500).json({ message: 'Error fetching supplier products', error: error.message });
  }
};

// Create a new order from manager to supplier
const createOrder = async (req, res) => {
  try {
    const { supplierId, items, expectedDeliveryDate, notes } = req.body;
    const managerId = req.user.id;

    console.log('🛒 Creating manager order:');
    console.log('Manager ID:', managerId);
    console.log('Supplier ID:', supplierId);
    console.log('Items:', items);

    // Validate required fields
    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Supplier ID and items are required' });
    }

    // Get manager details
    const manager = await User.findById(managerId).populate('storeId');
    if (!manager || !manager.storeId) {
      return res.status(404).json({ message: 'Manager or store not found' });
    }

    // Get supplier details
    const supplier = await User.findById(supplierId);
    if (!supplier || supplier.role !== 'supplier') {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Validate and prepare order items
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `Product ${item.productId} not found or inactive` });
      }

      // Check if product belongs to the supplier
      if (product.supplierId.toString() !== supplierId) {
        return res.status(400).json({ message: `Product ${product.name} does not belong to this supplier` });
      }

      // Check if product is available for manager's store
      if (!product.storeIds.includes(manager.storeId._id)) {
        return res.status(400).json({ message: `Product ${product.name} is not available for your store` });
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        productImage: product.image?.url || null,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal
      });
    }

    // Create the order
    const order = new ManagerOrder({
      managerId: manager._id,
      managerName: `${manager.firstName} ${manager.lastName}`,
      managerEmail: manager.email,
      supplierId: supplier._id,
      supplierName: supplier.companyName || `${supplier.firstName} ${supplier.lastName}`,
      storeId: manager.storeId._id,
      storeName: manager.storeId.name,
      items: orderItems,
      totalAmount: totalAmount,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      notes: {
        manager: notes || ''
      }
    });

    await order.save();

    console.log(`✅ Order created successfully: ${order.orderNumber}`);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });

  } catch (error) {
    console.error('❌ Error in createOrder:', error);
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
};

// Get manager's orders
const getManagerOrders = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { status, supplierId, dateFrom, dateTo, sort = 'orderDate' } = req.query;

    console.log('📋 Getting manager orders:');
    console.log('Manager ID:', managerId);
    console.log('Status:', status);
    console.log('Supplier ID:', supplierId);

    const options = {
      status,
      supplierId,
      dateFrom,
      dateTo,
      sort: sort === 'orderDate' ? { orderDate: -1 } : { createdAt: -1 }
    };

    const orders = await ManagerOrder.findByManager(managerId, options);

    console.log(`📋 Found ${orders.length} orders for manager`);

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });

  } catch (error) {
    console.error('❌ Error in getManagerOrders:', error);
    res.status(500).json({ message: 'Error fetching manager orders', error: error.message });
  }
};

// Get supplier's orders (for supplier dashboard)
const getSupplierOrders = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { status, storeId, dateFrom, dateTo, sort = 'orderDate' } = req.query;

    console.log('📋 Getting supplier orders:');
    console.log('Supplier ID:', supplierId);
    console.log('Status:', status);
    console.log('Store ID:', storeId);

    const options = {
      status,
      storeId,
      dateFrom,
      dateTo,
      sort: sort === 'orderDate' ? { orderDate: -1 } : { createdAt: -1 }
    };

    const orders = await ManagerOrder.findBySupplier(supplierId, options);

    console.log(`📋 Found ${orders.length} orders for supplier`);

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });

  } catch (error) {
    console.error('❌ Error in getSupplierOrders:', error);
    res.status(500).json({ message: 'Error fetching supplier orders', error: error.message });
  }
};

// Update order status (approve/reject by supplier)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    const supplierId = req.user.id;

    console.log('🔄 Updating order status:');
    console.log('Order ID:', orderId);
    console.log('New Status:', status);
    console.log('Supplier ID:', supplierId);

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be "approved" or "rejected"' });
    }

    // Find the order
    const order = await ManagerOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if supplier owns this order
    if (order.supplierId.toString() !== supplierId) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Check if order can be updated
    if (order.status !== 'pending') {
      return res.status(400).json({ message: `Order cannot be updated. Current status: ${order.status}` });
    }

    // Update order status
    await order.updateStatus(status, supplierId, notes);

    console.log(`✅ Order ${orderId} status updated to ${status}`);

    res.json({
      success: true,
      message: `Order ${status} successfully`,
      data: order
    });

  } catch (error) {
    console.error('❌ Error in updateOrderStatus:', error);
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

// Get order details
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('📋 Getting order details:');
    console.log('Order ID:', orderId);
    console.log('User ID:', userId);
    console.log('User Role:', userRole);

    const order = await ManagerOrder.findById(orderId)
      .populate('managerId', 'firstName lastName email')
      .populate('supplierId', 'firstName lastName email companyName')
      .populate('storeId', 'name storeCode address')
      .populate('items.productId', 'name image sku category description');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    if (userRole === 'manager' && order.managerId._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    if (userRole === 'supplier' && order.supplierId._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    console.log(`✅ Order details retrieved for ${orderId}`);

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('❌ Error in getOrderDetails:', error);
    res.status(500).json({ message: 'Error fetching order details', error: error.message });
  }
};

module.exports = {
  getSupplierProducts,
  createOrder,
  getManagerOrders,
  getSupplierOrders,
  updateOrderStatus,
  getOrderDetails
}; 