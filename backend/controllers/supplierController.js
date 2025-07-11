const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get all suppliers
const getAllSuppliers = async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 10 } = req.query;

    // Build query
    let query = { isActive: true };
    
    if (category) query.categories = category;
    if (status === 'approved') query.isApproved = true;
    if (status === 'pending') query.isApproved = false;

    // Build aggregation pipeline for search
    let pipeline = [{ $match: query }];

    // Add search if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { companyName: { $regex: search, $options: 'i' } },
            { 'contactPerson.name': { $regex: search, $options: 'i' } },
            { 'contactPerson.email': { $regex: search, $options: 'i' } },
            { 'companyInfo.industry': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push(
      { $sort: { 'performance.rating': -1, companyName: 1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    // Add computed fields
    pipeline.push({
      $addFields: {
        completionRate: {
          $cond: {
            if: { $eq: ['$performance.totalOrders', 0] },
            then: 100,
            else: {
              $multiply: [
                { $divide: ['$performance.completedOrders', '$performance.totalOrders'] },
                100
              ]
            }
          }
        },
        reliabilityScore: {
          $avg: [
            { $multiply: [
              { $cond: {
                if: { $eq: ['$performance.totalOrders', 0] },
                then: 1,
                else: { $divide: ['$performance.completedOrders', '$performance.totalOrders'] }
              }}, 40
            ]},
            { $multiply: [{ $divide: ['$performance.onTimeDeliveryRate', 100] }, 35] },
            { $multiply: [{ $divide: ['$performance.qualityRating', 5] }, 25] }
          ]
        }
      }
    });

    const suppliers = await Supplier.aggregate(pipeline);

    // Get total count for pagination
    const totalQuery = [...pipeline.slice(0, -4)]; // Remove sort, skip, limit, addFields
    totalQuery.push({ $count: 'total' });
    const totalResult = await Supplier.aggregate(totalQuery);
    const total = totalResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        suppliers,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: suppliers.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving suppliers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get supplier by ID
const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Get recent purchase orders for this supplier
    const recentOrders = await PurchaseOrder.find({ supplierId: id })
      .sort({ orderDate: -1 })
      .limit(10)
      .populate('createdBy', 'firstName lastName')
      .select('orderNumber orderDate status totalAmount expectedDeliveryDate');

    // Get performance summary
    const performanceSummary = {
      totalOrders: supplier.performance.totalOrders,
      completedOrders: supplier.performance.completedOrders,
      completionRate: supplier.completionRate,
      onTimeDeliveryRate: supplier.performance.onTimeDeliveryRate,
      averageDeliveryTime: supplier.performance.averageDeliveryTime,
      totalValue: supplier.performance.totalValue,
      reliabilityScore: supplier.reliabilityScore
    };

    res.json({
      success: true,
      data: {
        supplier,
        recentOrders,
        performanceSummary
      }
    });

  } catch (error) {
    console.error('Get supplier by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving supplier',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Create new supplier
const createSupplier = async (req, res) => {
  try {
    const {
      companyName,
      contactPerson,
      companyInfo,
      address,
      businessDetails,
      categories,
      certifications
    } = req.body;

    // Check if supplier with same company name exists
    const existingSupplier = await Supplier.findOne({ companyName });
    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        message: 'Supplier with this company name already exists'
      });
    }

    const newSupplier = new Supplier({
      companyName,
      contactPerson,
      companyInfo,
      address,
      businessDetails,
      categories: categories || [],
      certifications: certifications || [],
      isApproved: false // Requires approval
    });

    await newSupplier.save();

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully. Pending approval.',
      data: newSupplier
    });

  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating supplier',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update supplier
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.performance;
    delete updateData.isApproved;
    delete updateData.approvedBy;
    delete updateData.approvedDate;

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });

  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating supplier',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Approve supplier
const approveSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const managerId = req.user.id;

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      {
        isApproved: true,
        approvedBy: managerId,
        approvedDate: new Date()
      },
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier approved successfully',
      data: supplier
    });

  } catch (error) {
    console.error('Approve supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving supplier',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Deactivate supplier
const deactivateSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier deactivated successfully',
      data: supplier
    });

  } catch (error) {
    console.error('Deactivate supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating supplier',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all purchase orders
const getAllPurchaseOrders = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { supplier, status, startDate, endDate, page = 1, limit = 10 } = req.query;

    // Build query
    let query = { storeId };
    
    if (supplier) query.supplierId = supplier;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await PurchaseOrder.find(query)
      .populate('supplierId', 'companyName contactPerson')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PurchaseOrder.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: orders.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving purchase orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Create purchase order
const createPurchaseOrder = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const createdBy = req.user.id;
    const {
      supplierId,
      items,
      expectedDeliveryDate,
      notes,
      delivery
    } = req.body;

    // Validate supplier exists and is approved
    const supplier = await Supplier.findOne({ _id: supplierId, isActive: true, isApproved: true });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found or not approved'
      });
    }

    // Validate and populate items
    const populatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      const totalPrice = item.quantity * item.unitPrice;
      populatedItems.push({
        ...item,
        totalPrice,
        description: product.name
      });
      subtotal += totalPrice;
    }

    const newOrder = new PurchaseOrder({
      supplierId,
      storeId,
      createdBy,
      items: populatedItems,
      subtotal,
      totalAmount: subtotal, // Can add tax and shipping later
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      notes,
      delivery,
      status: 'pending'
    });

    newOrder.calculateTotals();
    await newOrder.save();

    // Populate the created order
    const populatedOrder = await PurchaseOrder.findById(newOrder._id)
      .populate('supplierId', 'companyName contactPerson')
      .populate('createdBy', 'firstName lastName')
      .populate('items.productId', 'name category barcode');

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: populatedOrder
    });

  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating purchase order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get purchase order by ID
const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;

    const order = await PurchaseOrder.findOne({ _id: id, storeId })
      .populate('supplierId', 'companyName contactPerson businessDetails')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('items.productId', 'name category barcode');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get purchase order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving purchase order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Approve purchase order
const approvePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;
    const approvedBy = req.user.id;

    const order = await PurchaseOrder.findOne({ _id: id, storeId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be approved'
      });
    }

    await order.approveOrder(approvedBy);

    const updatedOrder = await PurchaseOrder.findById(id)
      .populate('supplierId', 'companyName contactPerson')
      .populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Purchase order approved successfully',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Approve purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving purchase order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Receive items from purchase order
const receiveItems = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;
    const receivedBy = req.user.id;
    const { receivedItems } = req.body;

    const order = await PurchaseOrder.findOne({ _id: id, storeId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    await order.receiveItems(receivedItems, receivedBy);

    const updatedOrder = await PurchaseOrder.findById(id)
      .populate('supplierId', 'companyName contactPerson')
      .populate('items.productId', 'name category');

    res.json({
      success: true,
      message: 'Items received successfully',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Receive items error:', error);
    res.status(500).json({
      success: false,
      message: 'Error receiving items',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get supplier analytics
const getSupplierAnalytics = async (req, res) => {
  try {
    // Get overall supplier metrics
    const supplierMetrics = await Supplier.aggregate([
      { $match: { isActive: true, isApproved: true } },
      {
        $group: {
          _id: null,
          totalSuppliers: { $sum: 1 },
          avgRating: { $avg: '$performance.rating' },
          avgOnTimeDelivery: { $avg: '$performance.onTimeDeliveryRate' },
          totalOrderValue: { $sum: '$performance.totalValue' }
        }
      }
    ]);

    // Get top performing suppliers
    const topSuppliers = await Supplier.findTopRated(5);

    // Get suppliers needing attention
    const suppliersNeedingAttention = await Supplier.findNeedingAttention();

    // Get category distribution
    const categoryDistribution = await Supplier.aggregate([
      { $match: { isActive: true, isApproved: true } },
      { $unwind: '$categories' },
      {
        $group: {
          _id: '$categories',
          count: { $sum: 1 },
          avgRating: { $avg: '$performance.rating' },
          avgOnTimeDelivery: { $avg: '$performance.onTimeDeliveryRate' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get purchase order metrics
    const orderMetrics = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          totalValue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: supplierMetrics[0] || {
          totalSuppliers: 0,
          avgRating: 0,
          avgOnTimeDelivery: 0,
          totalOrderValue: 0
        },
        topSuppliers,
        suppliersNeedingAttention,
        categoryDistribution,
        orderMetrics: orderMetrics[0] || {
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          totalValue: 0,
          avgOrderValue: 0
        }
      }
    });

  } catch (error) {
    console.error('Get supplier analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving supplier analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  approveSupplier,
  deactivateSupplier,
  getAllPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderById,
  approvePurchaseOrder,
  receiveItems,
  getSupplierAnalytics
}; 