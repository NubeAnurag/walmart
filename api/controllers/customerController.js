const mongoose = require('mongoose');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const { generateReceiptPDF, generateReceiptImage, generateReceiptFilename } = require('../utils/receiptGenerator');

// Get all active stores
const getStores = async (req, res) => {
  try {
    const stores = await Store.find({ isActive: true })
      .select('_id name storeCode address phone')
      .sort({ name: 1 });

    // Map _id to id for frontend compatibility
    const storesWithId = stores.map(store => ({
      ...store.toObject(),
      id: store._id
    }));

    res.json({
      success: true,
      message: 'Stores retrieved successfully',
      data: storesWithId
    });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving stores'
    });
  }
};

// Get products for a specific store
const getStoreProducts = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { category, search, minPrice, maxPrice, page = 1, limit = 20, sort = 'name' } = req.query;

    // Validate storeId parameter
    if (!storeId || storeId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required'
      });
    }

    // Validate store exists
    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Build query
    const query = {
      storeIds: storeId,
      isActive: true,
      stock: { $gt: 0 } // Only show products in stock
    };

    // Add filters
    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

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

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get products with pagination
    const products = await Product.find(query)
      .populate('supplierId', 'firstName lastName')
      .select('name description price category brand stock image rating')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    // Get unique categories for this store
    const categories = await Product.distinct('category', { storeIds: storeId, isActive: true });

    res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProducts,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        },
        categories,
        store: {
          id: store._id,
          name: store.name,
          storeCode: store.storeCode
        }
      }
    });
  } catch (error) {
    console.error('Get store products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving products'
    });
  }
};

// Get single product details
const getProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;
    const { storeId } = req.query;

    const product = await Product.findById(productId)
      .populate('supplierId', 'firstName lastName')
      .populate('storeIds', 'name storeCode');

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is available in the specified store
    if (storeId && !product.storeIds.some(store => store._id.toString() === storeId)) {
      return res.status(404).json({
        success: false,
        message: 'Product not available in this store'
      });
    }

    res.json({
      success: true,
      message: 'Product details retrieved successfully',
      data: product
    });
  } catch (error) {
    console.error('Get product details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving product details'
    });
  }
};

// Create customer order
const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customerId = req.user.id;
    const { storeId, items, customerInfo, paymentMethod = 'cash' } = req.body;

    // Validate required fields
    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Store ID and items are required'
      });
    }

    // Validate store exists
    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Get customer details
    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Generate transaction ID
    const generateTransactionId = () => {
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substr(2, 5);
      return `CUS-${timestamp}-${randomStr}`.toUpperCase();
    };

    const transactionId = generateTransactionId();

    // Process order items and validate stock
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity <= 0) {
        throw new Error('Invalid item data');
      }

      // Get product details
      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        throw new Error(`Product ${productId} not found or inactive`);
      }

      // Check if product is available in this store
      if (!product.storeIds.includes(storeId)) {
        throw new Error(`Product ${product.name} is not available in this store`);
      }

      // Check stock availability
      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`);
      }

      const itemTotal = product.price * quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        quantity: quantity,
        unitPrice: product.price,
        totalPrice: itemTotal
      });

      // Update product stock
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: -quantity } },
        { session }
      );

      // Also update inventory for manager dashboard
      const inventoryUpdate = await Inventory.findOneAndUpdate(
        { productId: productId, storeId: storeId },
        { 
          $inc: { quantity: -quantity },
          $set: { lastSold: new Date() },
          $push: {
            stockMovements: {
              type: 'out',
              quantity: quantity,
              reason: 'Customer purchase',
              reference: transactionId,
              timestamp: new Date(),
              performedBy: customerId
            }
          }
        },
        { session, new: true }
      );

      // Log inventory update for debugging
      if (inventoryUpdate) {
        console.log(`📦 Updated inventory for ${product.name}: -${quantity} units (Customer: ${customer.email})`);
      } else {
        console.log(`⚠️ No inventory record found for ${product.name} in store ${storeId}`);
      }
    }

    // Create sale record (for receipt generation)
    const sale = new Sale({
      transactionId,
      storeId,
      customerId,
      staffId: customerId, // Use customer as staff for self-service orders
      items: orderItems.map(item => ({
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      subtotal: totalAmount,
      totalAmount,
      paymentMethod,
      customerInfo: {
        name: customerInfo?.name || `${customer.firstName} ${customer.lastName}`,
        email: customerInfo?.email || customer.email,
        phone: customerInfo?.phone || customer.phone || '',
        isNewCustomer: false
      },
      saleDate: new Date(),
      status: 'completed',
      saleType: 'regular',
      channel: 'online'
    });

    await sale.save({ session });

    // Update inventory for the store
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        await Inventory.findOneAndUpdate(
          { productId: product._id, storeId: storeId },
          { $inc: { quantity: -item.quantity } },
          { session }
        );
      }
    }

    // Commit transaction
    await session.commitTransaction();

    // Populate the sale with details for response
    const populatedSale = await Sale.findById(sale._id)
      .populate('storeId', 'name storeCode address phone')
      .populate('customerId', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        sale: populatedSale,
        transactionId,
        totalAmount,
        receiptDownloadUrl: `/api/customer/receipt/${sale._id}`
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Create order error:', error);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  } finally {
    session.endSession();
  }
};

// Get customer orders
const getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { customerId };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Sale.find(query)
      .populate('storeId', 'name storeCode address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Sale.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalOrders,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving orders'
    });
  }
};

// Download receipt
const downloadReceipt = async (req, res) => {
  try {
    const { saleId } = req.params;
    const { format = 'pdf' } = req.query;
    const customerId = req.user.id;

    // Find the sale
    const sale = await Sale.findById(saleId)
      .populate('items.productId', 'name category')
      .populate('storeId', 'name storeCode address phone')
      .populate('customerId', 'firstName lastName');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Check if this receipt belongs to the customer
    if (sale.customerId._id.toString() !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Prepare receipt data
    const receiptData = {
      transactionId: sale.transactionId,
      saleDate: sale.saleDate,
      totalAmount: sale.totalAmount,
      subtotal: sale.subtotal,
      items: sale.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        category: item.category
      })),
      customerInfo: {
        name: sale.customerInfo.name,
        email: sale.customerInfo.email,
        phone: sale.customerInfo.phone
      },
      storeInfo: {
        name: sale.storeId.name,
        storeCode: sale.storeId.storeCode,
        address: sale.storeId.address,
        phone: sale.storeId.phone
      },
      staffInfo: {
        name: 'Self-Service',
        employeeId: 'ONLINE'
      }
    };

    // Generate receipt in requested format
    let fileBuffer;
    let contentType;
    
    if (format === 'pdf') {
      fileBuffer = await generateReceiptPDF(receiptData);
      contentType = 'application/pdf';
    } else if (format === 'jpeg' || format === 'jpg') {
      fileBuffer = await generateReceiptImage(receiptData, 'jpeg');
      contentType = 'image/jpeg';
    } else if (format === 'png') {
      fileBuffer = await generateReceiptImage(receiptData, 'png');
      contentType = 'image/png';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported format. Supported formats: pdf, jpeg, jpg, png'
      });
    }
    
    const filename = generateReceiptFilename(sale.transactionId, format);

    // Set response headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    // Send file as binary data
    res.end(fileBuffer, 'binary');

  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt'
    });
  }
};

module.exports = {
  getStores,
  getStoreProducts,
  getProductDetails,
  createOrder,
  getCustomerOrders,
  downloadReceipt
}; 