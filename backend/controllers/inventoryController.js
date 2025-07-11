const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

// Get all products with inventory information
const getAllProducts = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { category, status, search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build aggregation pipeline
    let pipeline = [
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
                    { $eq: ['$storeId', mongoose.Types.ObjectId(storeId)] }
                  ]
                }
              }
            }
          ],
          as: 'inventory'
        }
      },
      {
        $addFields: {
          inventory: { $arrayElemAt: ['$inventory', 0] },
          stockStatus: {
            $switch: {
              branches: [
                {
                  case: { $eq: [{ $ifNull: [{ $arrayElemAt: ['$inventory.quantity', 0] }, 0] }, 0] },
                  then: 'out_of_stock'
                },
                {
                  case: {
                    $lte: [
                      { $ifNull: [{ $arrayElemAt: ['$inventory.quantity', 0] }, 0] },
                      { $ifNull: [{ $arrayElemAt: ['$inventory.reorderLevel', 0] }, 0] }
                    ]
                  },
                  then: 'low_stock'
                },
                {
                  case: {
                    $gte: [
                      { $ifNull: [{ $arrayElemAt: ['$inventory.quantity', 0] }, 0] },
                      { $ifNull: [{ $arrayElemAt: ['$inventory.maxStock', 0] }, 100] }
                    ]
                  },
                  then: 'overstock'
                }
              ],
              default: 'in_stock'
            }
          }
        }
      }
    ];

    // Add filters
    let matchConditions = { isActive: true };
    
    if (category) matchConditions.category = category;
    if (status === 'low_stock') {
      pipeline.push({
        $match: { stockStatus: 'low_stock' }
      });
    } else if (status === 'out_of_stock') {
      pipeline.push({
        $match: { stockStatus: 'out_of_stock' }
      });
    } else if (status === 'overstock') {
      pipeline.push({
        $match: { stockStatus: 'overstock' }
      });
    }

    if (search) {
      matchConditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    pipeline.unshift({ $match: matchConditions });

    // Add sorting
    const sortField = sortBy === 'stockLevel' ? 'inventory.quantity' : sortBy;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const products = await Product.aggregate(pipeline);

    // Get total count for pagination
    const totalPipeline = [...pipeline.slice(0, -2)];
    totalPipeline.push({ $count: 'total' });
    const totalResult = await Product.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

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
    console.error('Get products error:', error);
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
          'items.productId': mongoose.Types.ObjectId(id),
          storeId: mongoose.Types.ObjectId(storeId),
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
    const { period = '30' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get inventory overview
    const overview = await Inventory.aggregate([
      { $match: { storeId: mongoose.Types.ObjectId(storeId) } },
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

    // Get category breakdown
    const categoryBreakdown = await Inventory.aggregate([
      { $match: { storeId: mongoose.Types.ObjectId(storeId) } },
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

    // Get stock movement trends
    const stockMovements = await Inventory.aggregate([
      { $match: { storeId: mongoose.Types.ObjectId(storeId) } },
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

    // Get turnover analysis
    const turnoverAnalysis = await Sale.aggregate([
      { $unwind: '$items' },
      {
        $match: {
          storeId: mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: startDate }
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
                    { $eq: ['$storeId', mongoose.Types.ObjectId(storeId)] }
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

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getStockAlerts,
  getInventoryAnalytics,
  updateReorderSettings
}; 