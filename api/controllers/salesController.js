const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Store = require('../models/Store');
const User = require('../models/User');
const { generateReceiptPDF, generateReceiptImage, generateReceiptFilename } = require('../utils/receiptGenerator');

// Generate unique transaction ID
const generateTransactionId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `TXN-${timestamp}-${randomStr}`.toUpperCase();
};

// Create a new sale
const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerName, customerEmail, customerPhone, items, totalAmount, storeId, cashierId } = req.body;
    const staffId = req.user?.id || cashierId;

    // Validate required fields
    if (!customerName || !items || !totalAmount || !storeId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (!customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required'
      });
    }

    // Check inventory and prepare sale items
    const saleItems = [];
    let calculatedTotal = 0;

    console.log('🔍 Processing sale items:', items.length);

    for (const item of items) {
      const { productId, quantity, price } = item;
      
      console.log(`📦 Processing item: productId=${productId}, quantity=${quantity}, price=${price}`);

      // Ensure productId is properly formatted and valid
      let cleanProductId;
      if (typeof productId === 'string' && productId.length === 24) {
        cleanProductId = productId;
      } else if (productId && typeof productId === 'object' && (productId._id || productId.id)) {
        cleanProductId = (productId._id || productId.id).toString();
      } else if (productId && typeof productId === 'object' && productId.toString) {
        cleanProductId = productId.toString();
      } else {
        console.error(`❌ Invalid productId format:`, { productId, type: typeof productId });
        throw new Error(`Invalid productId format: ${productId} (type: ${typeof productId})`);
      }

      // Validate that cleanProductId is a valid ObjectId format
      if (!cleanProductId || cleanProductId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(cleanProductId)) {
        console.error(`❌ Invalid ObjectId format: ${cleanProductId}`);
        throw new Error(`Invalid ObjectId format: ${cleanProductId}`);
      }
      
      console.log(`✅ Cleaned productId: ${cleanProductId}`);
      
      // Find inventory item
      const inventoryItem = await Inventory.findOne({
        productId: cleanProductId,
        storeId: storeId
      }).populate('productId').session(session);

      console.log(`🔍 Inventory lookup result for ${cleanProductId}:`, inventoryItem ? {
        found: true,
        quantity: inventoryItem.quantity,
        productName: inventoryItem.productId?.name
      } : { found: false });

      if (!inventoryItem) {
        console.error(`❌ Product not found in inventory: ${cleanProductId}`);
        console.error('📋 Available inventory items for store:', await Inventory.find({ storeId }).select('productId').lean());
        throw new Error(`Product not found in inventory: ${cleanProductId}`);
      }

      // Check if product is populated
      if (!inventoryItem.productId) {
        console.error(`❌ Product details not populated for inventory item: ${cleanProductId}`);
        throw new Error(`Product details not found for: ${cleanProductId}`);
      }

      // Check if enough stock is available
      if (inventoryItem.quantity < quantity) {
        console.error(`❌ Insufficient stock for ${inventoryItem.productId.name}. Available: ${inventoryItem.quantity}, Requested: ${quantity}`);
        throw new Error(`Insufficient stock for ${inventoryItem.productId.name}. Available: ${inventoryItem.quantity}, Requested: ${quantity}`);
      }

      // Validate price
      if (Math.abs(price - inventoryItem.productId.price) > 0.01) {
        console.error(`❌ Price mismatch for ${inventoryItem.productId.name}. Expected: ${inventoryItem.productId.price}, Received: ${price}`);
        throw new Error(`Price mismatch for ${inventoryItem.productId.name}`);
      }

      // Update inventory - deduct sold quantity
      inventoryItem.quantity -= quantity;
      inventoryItem.lastSold = new Date();
      await inventoryItem.save({ session });

      console.log(`✅ Updated inventory for ${inventoryItem.productId.name}: ${inventoryItem.quantity + quantity} -> ${inventoryItem.quantity}`);

      // Prepare sale item
      saleItems.push({
        productId: inventoryItem.productId._id,
        name: inventoryItem.productId.name,
        category: inventoryItem.productId.category,
        barcode: inventoryItem.productId.barcode,
        quantity: quantity,
        unitPrice: price,
        totalPrice: price * quantity,
        costPrice: inventoryItem.productId.costPrice || 0,
        profit: (price - (inventoryItem.productId.costPrice || 0)) * quantity
      });

      calculatedTotal += price * quantity;
    }

    // Verify total amount
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      throw new Error('Total amount mismatch');
    }

    // Create sale record
    const transactionId = generateTransactionId();
    const sale = new Sale({
      transactionId,
      storeId,
      staffId,
      items: saleItems,
      subtotal: calculatedTotal,
      totalAmount: calculatedTotal,
      totalCost: saleItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0),
      totalProfit: saleItems.reduce((sum, item) => sum + item.profit, 0),
      paymentMethod: 'cash', // Default to cash for now
      customerInfo: {
        name: customerName,
        email: customerEmail || '',
        phone: customerPhone || '',
        isNewCustomer: true
      },
      saleDate: new Date(),
      status: 'completed',
      saleType: 'regular',
      channel: 'in_store'
    });

    await sale.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate the sale with product details for response
    const populatedSale = await Sale.findById(sale._id)
      .populate('items.productId', 'name sku category')
      .populate('storeId', 'name storeCode address phone')
      .populate('staffId', 'firstName lastName employeeId');

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: {
        sale: populatedSale,
        receiptDownloadUrl: `/api/sales/${sale._id}/receipt`
      }
    });

  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    console.error('Create sale error:', error);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to process sale'
    });
  } finally {
    session.endSession();
  }
};

// Generate and download receipt PDF
const downloadReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'pdf' } = req.query; // Support format query parameter
    const userId = req.user.id;

    console.log('📄 Receipt download request:', { saleId: id, userId, format });

    // Find the sale
    const sale = await Sale.findById(id)
      .populate('items.productId', 'name sku category barcode')
      .populate('storeId', 'name storeCode address phone')
      .populate('staffId', 'firstName lastName employeeId');

    console.log('🔍 Sale lookup result:', sale ? 'Found' : 'Not found');

    if (!sale) {
      console.error('❌ Sale not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Check if user has permission to download this receipt
    // Allow if user is the cashier who made the sale, or manager/admin of the store
    const userRole = req.user.role;
    const userStoreId = req.user.storeId;
    
    console.log('🔒 Permission check:', { 
      userRole, 
      userStoreId: userStoreId?.toString(), 
      saleStoreId: sale.storeId._id.toString(),
      saleStaffId: sale.staffId._id.toString()
    });

    if (userRole === 'staff' && sale.staffId._id.toString() !== userId) {
      console.error('❌ Permission denied: Staff can only download own receipts');
      return res.status(403).json({
        success: false,
        message: 'You can only download receipts for your own sales'
      });
    }

    if ((userRole === 'manager' || userRole === 'admin') && sale.storeId._id.toString() !== userStoreId.toString()) {
      console.error('❌ Permission denied: Manager/Admin can only download store receipts');
      return res.status(403).json({
        success: false,
        message: 'You can only download receipts for your store'
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
        barcode: item.barcode,
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
        name: `${sale.staffId.firstName} ${sale.staffId.lastName}`,
        employeeId: sale.staffId.employeeId
      }
    };

    console.log('📋 Receipt data prepared:', {
      transactionId: receiptData.transactionId,
      itemCount: receiptData.items.length,
      total: receiptData.totalAmount
    });

    console.log(`🔄 Starting ${format.toUpperCase()} generation...`);
    
    let fileBuffer;
    let contentType;
    
    // Generate receipt in requested format
    if (format === 'pdf') {
      console.log('🔄 Calling generateReceiptPDF with data:', {
        transactionId: receiptData.transactionId,
        itemCount: receiptData.items.length
      });
      
      fileBuffer = await generateReceiptPDF(receiptData);
      contentType = 'application/pdf';
    } else if (format === 'jpeg' || format === 'jpg') {
      console.log('🔄 Calling generateReceiptImage (JPEG) with data:', {
        transactionId: receiptData.transactionId,
        itemCount: receiptData.items.length
      });
      
      fileBuffer = await generateReceiptImage(receiptData, 'jpeg');
      contentType = 'image/jpeg';
    } else if (format === 'png') {
      console.log('🔄 Calling generateReceiptImage (PNG) with data:', {
        transactionId: receiptData.transactionId,
        itemCount: receiptData.items.length
      });
      
      fileBuffer = await generateReceiptImage(receiptData, 'png');
      contentType = 'image/png';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported format. Supported formats: pdf, jpeg, jpg, png'
      });
    }
    
    const filename = generateReceiptFilename(sale.transactionId, format);

    console.log(`✅ ${format.toUpperCase()} generated successfully:`, {
      filename,
      bufferSize: fileBuffer.length,
      bufferType: typeof fileBuffer
    });

    // Set response headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    console.log(`📤 Sending ${format.toUpperCase()} response with headers:`, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': fileBuffer.length
    });

    // Send file as binary data
    res.end(fileBuffer, 'binary');

    console.log(`📤 ${format.toUpperCase()} receipt sent successfully`);

  } catch (error) {
    console.error('❌ Download receipt error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};



// Get sales for a store
const getStoreSales = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 10, startDate, endDate, staffId } = req.query;

    let filter = { storeId };

    // Add staff filter if provided
    if (staffId) {
      filter.staffId = staffId;
    }

    // Add date filter if provided
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate);
    }

    const sales = await Sale.find(filter)
      .populate('items.productId', 'name sku')
      .populate('staffId', 'firstName lastName employeeId')
      .sort({ saleDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sale.countDocuments(filter);

    res.json({
      success: true,
      data: {
        sales,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get store sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get store sales'
    });
  }
};

// Get sale by ID
const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findById(id)
      .populate('items.productId', 'name sku category')
      .populate('storeId', 'name storeCode address')
      .populate('staffId', 'firstName lastName employeeId');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: { sale }
    });

  } catch (error) {
    console.error('Get sale by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sale'
    });
  }
};

// Get sales analytics for a store
const getSalesAnalytics = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { period = 'today' } = req.query;

    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    const analytics = await Sale.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: startDate, $lt: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalProfit: { $sum: '$totalProfit' },
          averageOrderValue: { $avg: '$totalAmount' },
          totalItemsSold: { $sum: { $sum: '$items.quantity' } }
        }
      }
    ]);

    const result = analytics[0] || {
      totalSales: 0,
      totalRevenue: 0,
      totalProfit: 0,
      averageOrderValue: 0,
      totalItemsSold: 0
    };

    res.json({
      success: true,
      data: {
        analytics: result,
        period,
        dateRange: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sales analytics'
    });
  }
};

module.exports = {
  createSale,
  getStoreSales,
  getSaleById,
  getSalesAnalytics,
  downloadReceipt
}; 