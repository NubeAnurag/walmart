const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const ManagerOrder = require('../models/ManagerOrder');

// Get all products with inventory information (only products that have been received through deliveries)
const getAllProducts = async (req, res) => {
  try {
    console.log('🔍 getAllProducts called for inventory');
    console.log('👤 User:', req.user);
    
    const storeId = req.user.storeId;
    const managerId = req.user.id;
    const { category, status, search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    console.log('📊 Manager ID:', managerId);
    console.log('🏪 Store ID:', storeId);
    console.log('🔍 Category filter:', category);
    console.log('🔍 All query params:', req.query);

    let pipeline = [];
    
    // Always show only products from manager's orders (whether "All Categories" or specific category)
    console.log('📋 Showing products from manager orders');
    
    // Get products from manager's orders
    const ManagerOrder = require('../models/ManagerOrder');
    
    const allOrders = await ManagerOrder.find({
      managerId: new mongoose.Types.ObjectId(managerId),
      storeId: new mongoose.Types.ObjectId(storeId)
    }).select('items status orderNumber');

    console.log(`📋 Found ${allOrders.length} total orders for manager`);

    // Extract unique product IDs from all orders
    const productIds = new Set();
    allOrders.forEach(order => {
      console.log(`📦 Order ${order.orderNumber}: ${order.status} (${order.items.length} items)`);
      order.items.forEach(item => {
        productIds.add(item.productId.toString());
        console.log(`  - Product: ${item.productName} (ID: ${item.productId})`);
      });
    });

    // Convert to array of ObjectIds
    const productObjectIds = Array.from(productIds).map(id => new mongoose.Types.ObjectId(id));
    console.log(`🎯 Unique products from orders: ${productObjectIds.length}`);

    // If no products found in orders, return empty result
    if (productObjectIds.length === 0) {
      console.log('❌ No products found in manager orders');
      
      return res.json({
        success: true,
        data: {
          products: [],
          pagination: {
            current: parseInt(page),
            total: 0,
            count: 0,
            totalRecords: 0
          }
        },
        message: 'No products found in your orders yet.'
      });
    }

    // Check if inventory records exist, if not create them
    for (const order of allOrders) {
      for (const item of order.items) {
        const existingInventory = await Inventory.findOne({
          storeId: new mongoose.Types.ObjectId(storeId),
          productId: item.productId
        });

        if (!existingInventory) {
          console.log(`📦 Creating inventory record for ${item.productName}`);
          const newInventory = new Inventory({
            storeId: new mongoose.Types.ObjectId(storeId),
            productId: item.productId,
            quantity: item.quantity,
            reorderLevel: 5,
            maxStock: 100,
            stockMovements: [{
              type: 'in',
              quantity: item.quantity,
              reason: 'Order received',
              reference: order.orderNumber,
              timestamp: new Date(),
              updatedBy: new mongoose.Types.ObjectId(managerId)
            }],
            updatedBy: new mongoose.Types.ObjectId(managerId)
          });

          await newInventory.save();
        }
      }
    }

    // Pipeline for manager's order products only
    pipeline = [
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          productId: { $in: productObjectIds }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $match: {
          'product.isActive': true
        }
      },
      {
        $addFields: {
          stockStatus: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$quantity', 0] },
                  then: 'out_of_stock'
                },
                {
                  case: { $lte: ['$quantity', '$reorderLevel'] },
                  then: 'low_stock'
                },
                {
                  case: { $gte: ['$quantity', '$maxStock'] },
                  then: 'overstock'
                }
              ],
              default: 'in_stock'
            }
          }
        }
      }
    ];

    // Add category filter if specific category is selected
    if (category && category !== 'all') {
      console.log(`🔍 Filtering by category: ${category}`);
      pipeline.push({
        $match: { 'product.category': category }
      });
    }

    // Add status filter
    if (status && ['low_stock', 'out_of_stock', 'overstock', 'in_stock', 'not_tracked'].includes(status)) {
      pipeline.push({
        $match: { stockStatus: status }
      });
    }

    // Add search filter
    if (search) {
      if (category === 'all' || !category) {
        // For all products view
        pipeline.push({
          $match: {
            $or: [
              { 'name': { $regex: search, $options: 'i' } },
              { 'description': { $regex: search, $options: 'i' } },
              { 'brand': { $regex: search, $options: 'i' } },
              { 'barcode': { $regex: search, $options: 'i' } }
            ]
          }
        });
      } else {
        // For manager's order products
        pipeline.push({
          $match: {
            $or: [
              { 'product.name': { $regex: search, $options: 'i' } },
              { 'product.description': { $regex: search, $options: 'i' } },
              { 'product.brand': { $regex: search, $options: 'i' } },
              { 'product.barcode': { $regex: search, $options: 'i' } }
            ]
          }
        });
      }
    }

    // Restructure the output to match the expected format (always using manager's order products)
    console.log('🔄 Using manager orders projection');
    pipeline.push({
      $project: {
        _id: '$product._id',
        name: '$product.name',
        description: '$product.description',
        category: '$product.category',
        brand: '$product.brand',
        price: '$product.price',
        costPrice: '$product.costPrice',
        sku: '$product.sku',
        barcode: '$product.barcode',
        image: '$product.image',
        isActive: '$product.isActive',
        createdAt: '$product.createdAt',
        updatedAt: '$product.updatedAt',
        inventory: {
          _id: '$_id',
          quantity: '$quantity',
          reorderLevel: '$reorderLevel',
          maxStock: '$maxStock',
          stockStatus: '$stockStatus',
          lastUpdated: '$updatedAt'
        },
        stockStatus: '$stockStatus'
      }
    });

    // Add sorting (always using manager's order products structure)
    let sortField;
    if (sortBy === 'stockLevel') {
      sortField = 'quantity';
    } else if (sortBy === 'name') {
      sortField = 'product.name';
    } else if (sortBy === 'category') {
      sortField = 'product.category';
    } else if (sortBy === 'price') {
      sortField = 'product.price';
    } else {
      sortField = 'product.createdAt';
    }
    
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    console.log('🔄 Pipeline prepared, getting total count...');

    // Get total count for pagination (always using Inventory collection)
    const totalPipeline = [...pipeline];
    totalPipeline.push({ $count: 'total' });
    
    console.log('📊 Getting total from Inventory collection');
    const totalResult = await Inventory.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;
    console.log(`📊 Total products found: ${total}`);

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    console.log('🔄 Executing final pipeline...');
    console.log('📦 Executing on Inventory collection');
    const products = await Inventory.aggregate(pipeline);

    console.log(`✅ Found ${products.length} products to return`);
    
    res.json({
      success: true,
      data: {
        products,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: products.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('❌ Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get product by ID with inventory details
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;

    const product = await Product.findOne({ _id: id, isActive: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get inventory information
    const inventory = await Inventory.findOne({ productId: id, storeId });

    // Get recent sales data for this product
    const recentSales = await Sale.aggregate([
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': new mongoose.Types.ObjectId(id),
          storeId: new mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } }
          },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        product,
        inventory,
        recentSales,
        stockStatus: inventory ? inventory.stockStatus : 'not_tracked'
      }
    });

  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Create new product
const createProduct = async (req, res) => {
  try {
    const createdBy = req.user.id;
    const storeId = req.user.storeId;
    const productData = { ...req.body, createdBy };

    const newProduct = new Product(productData);
    await newProduct.save();

    // Create initial inventory record if quantity is provided
    if (req.body.initialQuantity !== undefined) {
      const inventoryData = {
        storeId,
        productId: newProduct._id,
        quantity: req.body.initialQuantity || 0,
        reorderLevel: req.body.reorderLevel || 10,
        maxStock: req.body.maxStock || 100,
        updatedBy: createdBy,
        stockMovements: [{
          type: 'in',
          quantity: req.body.initialQuantity || 0,
          reason: 'Initial stock',
          timestamp: new Date(),
          performedBy: createdBy
        }]
      };

      const inventory = new Inventory(inventoryData);
      await inventory.save();
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.createdBy;
    delete updateData.initialQuantity;

    const product = await Product.findOneAndUpdate(
      { _id: id, isActive: true },
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete (deactivate) product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOneAndUpdate(
      { _id: id },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deactivated successfully',
      data: product
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update stock level
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;
    const updatedBy = req.user.id;
    const { type, quantity, reason, reference } = req.body;

    // Validate input
    if (!['in', 'out', 'adjustment', 'transfer'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stock movement type'
      });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
    }

    // Find or create inventory record
    let inventory = await Inventory.findOne({ productId: id, storeId });
    
    if (!inventory) {
      // Create new inventory record
      inventory = new Inventory({
        storeId,
        productId: id,
        quantity: 0,
        reorderLevel: 10,
        maxStock: 100,
        updatedBy
      });
    }

    // Add stock movement
    const movement = {
      type,
      quantity: parseInt(quantity),
      reason,
      reference,
      timestamp: new Date(),
      performedBy: updatedBy
    };

    await inventory.addStockMovement(movement);

    // Get updated inventory with product details
    const updatedInventory = await Inventory.findById(inventory._id)
      .populate('productId', 'name category barcode');

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        inventory: updatedInventory,
        movement
      }
    });

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating stock',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get stock alerts
const getStockAlerts = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { type = 'all' } = req.query;

    let alerts = [];

    if (type === 'all' || type === 'low_stock') {
      const lowStockItems = await Inventory.findLowStock(storeId);
      alerts.push({
        type: 'low_stock',
        title: 'Low Stock Alert',
        count: lowStockItems.length,
        items: lowStockItems.map(item => ({
          id: item._id,
          product: item.productId,
          currentStock: item.quantity,
          reorderLevel: item.reorderLevel,
          stockStatus: item.stockStatus
        }))
      });
    }

    if (type === 'all' || type === 'out_of_stock') {
      const outOfStockItems = await Inventory.findOutOfStock(storeId);
      alerts.push({
        type: 'out_of_stock',
        title: 'Out of Stock Alert',
        count: outOfStockItems.length,
        items: outOfStockItems.map(item => ({
          id: item._id,
          product: item.productId,
          currentStock: item.quantity,
          reorderLevel: item.reorderLevel,
          stockStatus: item.stockStatus
        }))
      });
    }

    if (type === 'all' || type === 'overstock') {
      const overstockItems = await Inventory.findOverstock(storeId);
      alerts.push({
        type: 'overstock',
        title: 'Overstock Alert',
        count: overstockItems.length,
        items: overstockItems.map(item => ({
          id: item._id,
          product: item.productId,
          currentStock: item.quantity,
          maxStock: item.maxStock,
          stockStatus: item.stockStatus
        }))
      });
    }

    const totalAlerts = alerts.reduce((sum, alert) => sum + alert.count, 0);

    res.json({
      success: true,
      data: {
        alerts,
        totalAlerts,
        lastChecked: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving stock alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get inventory analytics
const getInventoryAnalytics = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const managerId = req.user.id;
    const { period = '30' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get products from manager's orders (same logic as main inventory)
    const allOrders = await ManagerOrder.find({
      managerId: new mongoose.Types.ObjectId(managerId),
      storeId: new mongoose.Types.ObjectId(storeId)
    }).select('items status orderNumber');

    // Extract unique product IDs from all orders
    const productIds = new Set();
    allOrders.forEach(order => {
      order.items.forEach(item => {
        productIds.add(item.productId.toString());
      });
    });

    // Convert to array of ObjectIds
    const productObjectIds = Array.from(productIds).map(id => new mongoose.Types.ObjectId(id));

    // If no products found in orders, return empty analytics
    if (productObjectIds.length === 0) {
      return res.json({
        success: true,
        data: {
          overview: {
            totalProducts: 0,
            totalValue: 0,
            totalCost: 0,
            averageStock: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            overstockCount: 0
          },
          categoryBreakdown: [],
          stockMovements: [],
          turnoverAnalysis: [],
          period: {
            days: parseInt(period),
            start: startDate.toISOString(),
            end: new Date().toISOString()
          }
        }
      });
    }

    // Get inventory overview (only for manager's products)
    const overview = await Inventory.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId),
          productId: { $in: productObjectIds }
        } 
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$quantity', '$product.price'] } },
          totalCost: { $sum: { $multiply: ['$quantity', '$product.costPrice'] } },
          averageStock: { $avg: '$quantity' },
          lowStockCount: {
            $sum: { $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0] }
          },
          outOfStockCount: {
            $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
          },
          overstockCount: {
            $sum: { $cond: [{ $gte: ['$quantity', '$maxStock'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get category breakdown (only for manager's products)
    const categoryBreakdown = await Inventory.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId),
          productId: { $in: productObjectIds }
        } 
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          productCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$product.price'] } },
          avgQuantity: { $avg: '$quantity' }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // Get stock movement trends (only for manager's products)
    const stockMovements = await Inventory.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId),
          productId: { $in: productObjectIds }
        } 
      },
      { $unwind: '$stockMovements' },
      {
        $match: {
          'stockMovements.timestamp': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$stockMovements.timestamp'
              }
            },
            type: '$stockMovements.type'
          },
          totalQuantity: { $sum: '$stockMovements.quantity' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Get turnover analysis (only for manager's products)
    const turnoverAnalysis = await Sale.aggregate([
      { $unwind: '$items' },
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: startDate },
          'items.productId': { $in: productObjectIds }
        }
      },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          salesCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'inventories',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$productId', '$$productId'] },
                    { $eq: ['$storeId', new mongoose.Types.ObjectId(storeId)] }
                  ]
                }
              }
            }
          ],
          as: 'inventory'
        }
      },
      { $unwind: { path: '$inventory', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $addFields: {
          turnoverRate: {
            $cond: {
              if: { $gt: ['$inventory.quantity', 0] },
              then: { $divide: ['$totalSold', '$inventory.quantity'] },
              else: 0
            }
          }
        }
      },
      { $sort: { turnoverRate: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        overview: overview[0] || {
          totalProducts: 0,
          totalValue: 0,
          totalCost: 0,
          averageStock: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          overstockCount: 0
        },
        categoryBreakdown,
        stockMovements,
        turnoverAnalysis,
        period: {
          days: parseInt(period),
          start: startDate.toISOString(),
          end: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Get inventory analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving inventory analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update reorder settings
// Test endpoint without auth (temporary)
const testInventoryDirect = async (req, res) => {
  try {
    // Hard-coded manager details from logs
    const managerId = '687164e2a0f1eabadaf16341';
    const storeId = '6871614bc7c1418205200192';
    
    console.log('🔧 Testing inventory directly for manager:', managerId);
    
    // Import ManagerOrder within the function to avoid circular dependency issues
    const ManagerOrder = require('../models/ManagerOrder');
    
    // Get all orders for this manager
    const orders = await ManagerOrder.find({ managerId: new mongoose.Types.ObjectId(managerId) });
    console.log(`📋 Found ${orders.length} orders`);
    
    const orderDetails = orders.map(order => ({
      orderNumber: order.orderNumber,
      status: order.status,
      itemCount: order.items.length,
      items: order.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        productId: item.productId
      }))
    }));
    
    // Get unique product IDs
    const productIds = new Set();
    orders.forEach(order => {
      order.items.forEach(item => {
        productIds.add(item.productId.toString());
      });
    });
    
    // Create inventory records if they don't exist
    let created = 0;
    for (const order of orders) {
      for (const item of order.items) {
        const existingInv = await Inventory.findOne({
          storeId: new mongoose.Types.ObjectId(storeId),
          productId: item.productId
        });
        
        if (!existingInv) {
          const newInventory = new Inventory({
            storeId: new mongoose.Types.ObjectId(storeId),
            productId: item.productId,
            quantity: item.quantity,
            reorderLevel: 5,
            maxStock: 100,
            stockMovements: [{
              type: 'in',
              quantity: item.quantity,
              reason: 'Order received',
              reference: order.orderNumber,
              timestamp: new Date(),
              updatedBy: new mongoose.Types.ObjectId(managerId)
            }],
            updatedBy: new mongoose.Types.ObjectId(managerId)
          });
          
          await newInventory.save();
          console.log(`✅ Created inventory for ${item.productName}: ${item.quantity} units`);
          created++;
        }
      }
    }
    
    // Get final inventory
    const inventory = await Inventory.find({ storeId: new mongoose.Types.ObjectId(storeId) }).populate('productId');
    
    // Test aggregation pipeline
    const productObjectIds = Array.from(productIds).map(id => new mongoose.Types.ObjectId(id));
    const pipeline = [
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          productId: { $in: productObjectIds }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          category: '$product.category',
          price: '$product.price',
          inventory: {
            quantity: '$quantity',
            reorderLevel: '$reorderLevel'
          }
        }
      }
    ];
    
    const aggregationResult = await Inventory.aggregate(pipeline);
    
    res.json({
      success: true,
      data: {
        managerId,
        storeId,
        orders: orderDetails,
        inventoryCreated: created,
        inventoryCount: inventory.length,
        aggregationResult: aggregationResult,
        productIds: Array.from(productIds)
      }
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing inventory',
      error: error.message
    });
  }
};

// Debug endpoint to check orders (temporary)
const debugCheckOrders = async (req, res) => {
  try {
    const managerId = req.user.id;
    const storeId = req.user.storeId;
    
    console.log('🔧 Debug: Checking orders for manager:', managerId);
    console.log('🏪 Store ID:', storeId);
    
    // Get all orders for this manager
    const orders = await ManagerOrder.find({ managerId: new mongoose.Types.ObjectId(managerId) });
    console.log(`📋 Found ${orders.length} orders`);
    
    const orderDetails = orders.map(order => ({
      orderNumber: order.orderNumber,
      status: order.status,
      itemCount: order.items.length,
      items: order.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        productId: item.productId
      }))
    }));
    
    // Check inventory
    const inventory = await Inventory.find({ storeId: new mongoose.Types.ObjectId(storeId) });
    console.log(`📦 Found ${inventory.length} inventory records`);
    
    res.json({
      success: true,
      data: {
        managerId,
        storeId,
        orders: orderDetails,
        inventoryCount: inventory.length
      }
    });
    
  } catch (error) {
    console.error('❌ Debug check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking orders',
      error: error.message
    });
  }
};

// Debug endpoint to fix orders (temporary)
const debugFixOrders = async (req, res) => {
  try {
    const managerId = req.user.id;
    const storeId = req.user.storeId;
    
    console.log('🔧 Debug: Fixing orders for manager:', managerId);
    
    // Get all orders for this manager
    const orders = await ManagerOrder.find({ managerId: new mongoose.Types.ObjectId(managerId) });
    console.log(`📋 Found ${orders.length} orders`);
    
    let updatedOrders = 0;
    let createdInventory = 0;
    
    for (const order of orders) {
      if (order.status !== 'delivered') {
        console.log(`🔧 Updating order ${order.orderNumber} to delivered`);
        
        order.status = 'delivered';
        order.actualDeliveryDate = new Date();
        order.deliveryAcceptedDate = new Date();
        order.deliveryAcceptedBy = new mongoose.Types.ObjectId(managerId);
        order.deliveryStatus = 'complete';
        
        // Mark all items as delivered
        order.items.forEach(item => {
          item.isDelivered = true;
          item.deliveredQuantity = item.quantity;
        });
        
        await order.save();
        updatedOrders++;
        
        // Create inventory records
        for (const item of order.items) {
          const existingInventory = await Inventory.findOne({
            storeId: new mongoose.Types.ObjectId(storeId),
            productId: item.productId
          });
          
          if (!existingInventory) {
            const newInventory = new Inventory({
              storeId: new mongoose.Types.ObjectId(storeId),
              productId: item.productId,
              quantity: item.deliveredQuantity,
              reorderLevel: 5,
              maxStock: 100,
              stockMovements: [{
                type: 'in',
                quantity: item.deliveredQuantity,
                reason: 'Order delivery',
                reference: order.orderNumber,
                timestamp: new Date(),
                updatedBy: new mongoose.Types.ObjectId(managerId)
              }],
              updatedBy: new mongoose.Types.ObjectId(managerId)
            });
            
            await newInventory.save();
            createdInventory++;
            console.log(`✅ Created inventory for ${item.productName}: ${item.deliveredQuantity} units`);
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: `Fixed ${updatedOrders} orders and created ${createdInventory} inventory records`,
      data: {
        updatedOrders,
        createdInventory
      }
    });
    
  } catch (error) {
    console.error('❌ Debug fix error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing orders',
      error: error.message
    });
  }
};

const updateReorderSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;
    const { reorderLevel, maxStock } = req.body;

    const inventory = await Inventory.findOneAndUpdate(
      { productId: id, storeId },
      { reorderLevel, maxStock },
      { new: true, runValidators: true }
    ).populate('productId', 'name category');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found'
      });
    }

    res.json({
      success: true,
      message: 'Reorder settings updated successfully',
      data: inventory
    });

  } catch (error) {
    console.error('Update reorder settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating reorder settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get store inventory for staff dashboard
const getStoreInventory = async (req, res) => {
  try {
    const { storeId } = req.params;
    
    console.log('🏪 Getting store inventory for storeId:', storeId);
    
    // Get all inventory items for the store with populated product details
    const inventory = await Inventory.find({ storeId })
      .populate({
        path: 'productId',
        select: 'name description category brand price costPrice sku barcode image isActive'
      })
      .sort({ 'productId.name': 1 });

    console.log(`📦 Found ${inventory.length} inventory items`);
    
    // Filter out items with inactive products
    const activeInventory = inventory.filter(item => item.productId && item.productId.isActive);
    
    console.log(`✅ ${activeInventory.length} active inventory items after filtering`);
    
    // Log first item structure for debugging
    if (activeInventory.length > 0) {
      console.log('📋 Sample inventory item structure:', {
        _id: activeInventory[0]._id,
        quantity: activeInventory[0].quantity,
        productId: {
          _id: activeInventory[0].productId._id,
          name: activeInventory[0].productId.name,
          price: activeInventory[0].productId.price
        }
      });
      
      // Log the exact JSON structure being sent
      console.log('📤 JSON structure being sent to frontend:');
      console.log(JSON.stringify({
        _id: activeInventory[0]._id,
        quantity: activeInventory[0].quantity,
        productId: {
          _id: activeInventory[0].productId._id,
          name: activeInventory[0].productId.name,
          price: activeInventory[0].productId.price,
          category: activeInventory[0].productId.category,
          brand: activeInventory[0].productId.brand
        }
      }, null, 2));
    }

    res.json({
      success: true,
      data: { inventory: activeInventory }
    });

  } catch (error) {
    console.error('Get store inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get store inventory',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getStockAlerts,
  getInventoryAnalytics,
  updateReorderSettings,
  getStoreInventory,
  testInventoryDirect,
  debugCheckOrders,
  debugFixOrders
}; 