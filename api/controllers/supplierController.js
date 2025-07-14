const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Store = require('../models/Store');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { uploadImageToCloudinary, deleteImageFromCloudinary } = require('../utils/cloudinaryUpload');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/products');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

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

// Dashboard Overview
const getDashboardStats = async (req, res) => {
  try {
    const supplierId = req.user.id || req.user._id;

    // Get supplier's rating (average from all products)
    const supplierRating = await Product.aggregate([
      { $match: { supplierId: new mongoose.Types.ObjectId(supplierId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating.average' },
          totalRatings: { $sum: '$rating.count' }
        }
      }
    ]);

    // Get associated stores from Supplier model
    const supplier = await Supplier.findByUserId(supplierId);
    
    // Get product stats
    const productStats = await Product.aggregate([
      { $match: { supplierId: new mongoose.Types.ObjectId(supplierId), isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          outOfStock: {
            $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
          },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);

    // Get order stats for last 30 days
    const orderStats = await Order.getOrderStats(supplierId, '30d');

    // Get recent orders
    const recentOrders = await Order.findBySupplier(supplierId, { limit: 5 });

    res.json({
      success: true,
      data: {
        rating: {
          average: supplierRating[0]?.averageRating || 0,
          count: supplierRating[0]?.totalRatings || 0
        },
        stores: supplier?.assignedStores || [],
        productStats: productStats[0] || {
          totalProducts: 0,
          totalStock: 0,
          outOfStock: 0,
          averagePrice: 0
        },
        orderStats: orderStats,
        recentOrders: recentOrders
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
};

// Product Management
const getProducts = async (req, res) => {
  try {
    const supplierId = req.user.id || req.user._id;
    const { category, search, page = 1, limit = 20 } = req.query;

    const options = {
      category,
      search,
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const products = await Product.findBySupplier(supplierId, options);
    const total = await Product.countDocuments({ 
      supplierId, 
      isActive: true,
      ...(category && { category }),
      ...(search && { $text: { $search: search } })
    });

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
};

const addProduct = async (req, res) => {
  try {
    const supplierId = req.user.id || req.user._id;
    const { name, description, price, category, brand, stock, image } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category || !brand || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided: name, description, price, category, brand, stock'
      });
    }

    // Get supplier's assigned stores from Supplier model
    const supplier = await Supplier.findByUserId(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier profile not found'
      });
    }

    if (!supplier.assignedStores || supplier.assignedStores.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No stores assigned to this supplier. Please contact administrator.'
      });
    }

    // Handle image upload to Cloudinary if provided
    let imageData = null;
    if (image) {
      if (typeof image !== 'string' || !image.startsWith('data:image/')) {
        return res.status(400).json({
          success: false,
          message: 'Image must be a valid base64 data URL starting with data:image/'
        });
      }

      try {
        // Upload image to Cloudinary
        const cloudinaryResult = await uploadImageToCloudinary(image, 'walmart-products');
        imageData = {
          url: cloudinaryResult.url,
          publicId: cloudinaryResult.publicId,
          format: cloudinaryResult.format,
          width: cloudinaryResult.width,
          height: cloudinaryResult.height,
          bytes: cloudinaryResult.bytes
        };
      } catch (error) {
        console.error('Image upload error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image. Please try again.'
        });
      }
    }

    const product = new Product({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      brand: brand.trim(),
      stock: parseInt(stock),
      image: imageData,
      supplierId,
      storeIds: supplier.assignedStores.map(store => store._id)
    });

    await product.save();
    await product.populate('storeIds', 'name storeCode');

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Add product error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => {
        if (err.path === 'description' && err.kind === 'maxlength') {
          return `Description is too long. Maximum ${err.properties.maxlength} characters allowed, but got ${err.value.length} characters.`;
        }
        if (err.path === 'name' && err.kind === 'maxlength') {
          return `Product name is too long. Maximum ${err.properties.maxlength} characters allowed.`;
        }
        return err.message;
      });
      return res.status(400).json({
        success: false,
        message: 'Product validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding product'
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const supplierId = req.user.id || req.user._id;
    const { productId } = req.params;
    const { name, description, price, category, brand, stock, image } = req.body;

    const product = await Product.findOne({ _id: productId, supplierId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }

    // Update fields
    if (name) product.name = name.trim();
    if (description) product.description = description.trim();
    if (price !== undefined) product.price = parseFloat(price);
    if (category) product.category = category;
    if (brand) product.brand = brand.trim();
    if (stock !== undefined) product.stock = parseInt(stock);

    // Handle image update with Cloudinary
    if (image !== undefined) {
      if (image === null || image === '') {
        // Remove image from Cloudinary if it exists
        if (product.image && product.image.publicId) {
          try {
            await deleteImageFromCloudinary(product.image.publicId);
          } catch (error) {
            console.error('Error deleting old image:', error);
            // Continue anyway - don't fail the update
          }
        }
        product.image = null;
      } else {
        // Validate and upload new image
        if (typeof image !== 'string' || !image.startsWith('data:image/')) {
          return res.status(400).json({
            success: false,
            message: 'Image must be a valid base64 data URL starting with data:image/'
          });
        }

        try {
          // Delete old image from Cloudinary if it exists
          if (product.image && product.image.publicId) {
            try {
              await deleteImageFromCloudinary(product.image.publicId);
            } catch (error) {
              console.error('Error deleting old image:', error);
              // Continue anyway - don't fail the update
            }
          }

          // Upload new image to Cloudinary
          const cloudinaryResult = await uploadImageToCloudinary(image, 'walmart-products');
          product.image = {
            url: cloudinaryResult.url,
            publicId: cloudinaryResult.publicId,
            format: cloudinaryResult.format,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height,
            bytes: cloudinaryResult.bytes
          };
        } catch (error) {
          console.error('Image upload error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload image. Please try again.'
          });
        }
      }
    }

    await product.save();
    await product.populate('storeIds', 'name storeCode');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Update product error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating product'
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const supplierId = req.user.id || req.user._id;
    const { productId } = req.params;

    const product = await Product.findOne({ _id: productId, supplierId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }

    // Delete image from Cloudinary if it exists
    if (product.image && product.image.publicId) {
      try {
        await deleteImageFromCloudinary(product.image.publicId);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        // Continue anyway - don't fail the deletion
      }
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
};

// Order Management
const getOrders = async (req, res) => {
  try {
    const supplierId = req.user.id || req.user._id;
    const { status, storeId, page = 1, limit = 20 } = req.query;

    const options = {
      status,
      storeId,
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const orders = await Order.findBySupplier(supplierId, options);
    const total = await Order.countDocuments({ 
      supplierId, 
      isActive: true,
      ...(status && { status }),
      ...(storeId && { storeId })
    });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const supplierId = req.user.id || req.user._id;
    const { orderId } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findOne({ _id: orderId, supplierId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    if (!['Order Received', 'Order Completed', 'Order Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    await order.updateStatus(status, supplierId, notes);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
};

const updateDeliveryTime = async (req, res) => {
  try {
    const supplierId = req.user.id || req.user._id;
    const { orderId } = req.params;
    const { estimatedDeliveryTime } = req.body;

    const order = await Order.findOne({ _id: orderId, supplierId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    await order.updateDeliveryTime(estimatedDeliveryTime, supplierId);

    res.json({
      success: true,
      message: 'Delivery time updated successfully',
      data: { order }
    });

  } catch (error) {
    console.error('Update delivery time error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating delivery time'
    });
  }
};

// Get supplier's stores
const getSupplierStores = async (req, res) => {
  try {
    const supplierId = req.user.id || req.user._id;
    
    // Get supplier profile from Supplier model
    const supplier = await Supplier.findByUserId(supplierId);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        stores: supplier.assignedStores || []
      }
    });

  } catch (error) {
    console.error('Get supplier stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stores'
    });
  }
};

// Get suppliers by store (for managers)
const getSuppliersByStore = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const userId = req.user.id || req.user._id;
    
    console.log('🔍 getSuppliersByStore Debug:');
    console.log('User ID:', userId);
    console.log('Store ID:', storeId);
    console.log('User Role:', req.user.role);
    
    if (!storeId) {
      console.log('❌ Manager has no store assigned');
      return res.status(400).json({
        success: false,
        message: 'Manager must be assigned to a store'
      });
    }

    // Find suppliers assigned to the manager's store
    const suppliers = await Supplier.find({
      assignedStores: storeId,
      isActive: true,
      isApproved: true
    })
    .populate('assignedStores', 'name storeCode')
    .populate('userId', 'firstName lastName email')
    .lean(); // Use lean() for better performance and plain objects

    console.log(`📊 Found ${suppliers.length} suppliers for store ${storeId}`);
    
    // Log first supplier details for debugging
    if (suppliers.length > 0) {
      console.log('📊 First supplier details:', {
        _id: suppliers[0]._id,
        companyName: suppliers[0].companyName,
        contactPerson: suppliers[0].contactPerson,
        isActive: suppliers[0].isActive,
        isApproved: suppliers[0].isApproved,
        categories: suppliers[0].categories
      });
    }
    
    suppliers.forEach(supplier => {
      console.log(`  - ${supplier.companyName} (Active: ${supplier.isActive}, Approved: ${supplier.isApproved})`);
    });

    // Return suppliers in a consistent format
    const responseData = {
      success: true,
      suppliers: suppliers,
      count: suppliers.length,
      storeId: storeId
    };

    console.log('📤 Sending response with suppliers:', responseData.suppliers.length);
    res.json(responseData);

  } catch (error) {
    console.error('Get suppliers by store error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suppliers for store',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Debug endpoint to check store data relationships
const debugStoreData = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const userStoreId = req.user.storeId;
    
    // Get current user details
    const currentUser = await User.findById(userId).populate('storeId');
    
    // Get all suppliers
    const allSuppliers = await Supplier.find({}).populate('assignedStores', 'name storeCode');
    
    // Get all stores
    const allStores = await Store.find({});
    
    // Get suppliers for user's store specifically
    const suppliersForStore = await Supplier.find({
      assignedStores: userStoreId,
      isActive: true,
      isApproved: true
    }).populate('assignedStores', 'name storeCode');

    res.json({
      success: true,
      debug: {
        currentUser: {
          id: userId,
          role: currentUser.role,
          storeId: userStoreId,
          storeName: currentUser.storeId?.name,
          storeCode: currentUser.storeId?.storeCode
        },
        allStores: allStores.map(store => ({
          id: store._id,
          name: store.name,
          storeCode: store.storeCode
        })),
        allSuppliers: allSuppliers.map(supplier => ({
          id: supplier._id,
          companyName: supplier.companyName,
          isActive: supplier.isActive,
          isApproved: supplier.isApproved,
          assignedStores: supplier.assignedStores.map(store => ({
            id: store._id,
            name: store.name,
            storeCode: store.storeCode
          }))
        })),
        suppliersForUserStore: suppliersForStore.map(supplier => ({
          id: supplier._id,
          companyName: supplier.companyName,
          assignedStores: supplier.assignedStores.map(store => ({
            id: store._id,
            name: store.name,
            storeCode: store.storeCode
          }))
        })),
        query: {
          assignedStores: userStoreId,
          isActive: true,
          isApproved: true
        }
      }
    });

  } catch (error) {
    console.error('Debug store data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching debug data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get products for a specific supplier
 * @route GET /api/supplier/:supplierId/products
 * @access Private - Both suppliers and managers can access
 */
const getSupplierProducts = async (req, res) => {
  try {
    const { id, supplierId } = req.params;
    // Use either id or supplierId parameter depending on which route was used
    const supplierIdToUse = id || supplierId;

    // Validate supplierId
    if (!supplierIdToUse || supplierIdToUse === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Valid Supplier ID is required' 
      });
    }

    console.log(`🔍 Getting products for supplier: ${supplierIdToUse} (Role: ${req.user.role})`);

    // Find supplier profile first
    const supplier = await Supplier.findById(supplierIdToUse).populate('userId');
    if (!supplier) {
      console.log(`❌ Supplier not found with ID: ${supplierIdToUse}`);
      return res.status(404).json({
        success: false,
        message: 'Supplier not found' 
      });
    }

    // Get the User ID from the supplier profile (this is what products are linked to)
    const supplierUserId = supplier.userId._id;
    console.log(`🔗 Supplier details:`);
    console.log(`   - Company: ${supplier.companyName}`);
    console.log(`   - Supplier ID: ${supplier._id}`);
    console.log(`   - User ID: ${supplierUserId}`);

    // Get all products associated with this supplier's user ID
    const products = await Product.find({ 
      supplierId: supplierUserId,
      isActive: true
    })
      .select('name description price stock image category brand sku')
      .sort({ createdAt: -1 })
      .lean(); // Use lean for better performance and to allow modifications
    
    // Transform products to ensure consistent format
    const transformedProducts = products.map(product => ({
      ...product,
      id: product._id.toString(), // Add id field for frontend compatibility
      _id: product._id.toString(), // Ensure _id is a string
      // Ensure image has proper structure
      image: product.image || { url: null, publicId: null }
    }));
    
    console.log(`📊 Found ${transformedProducts.length} products for supplier ${supplier.companyName}`);
    if (transformedProducts.length > 0) {
      console.log(`📦 Products:`);
      transformedProducts.forEach(p => {
        console.log(`   - ${p.name} (ID: ${p._id}, Price: $${p.price}, Image: ${p.image?.url ? 'Yes' : 'No'})`);
      });
    }

    res.json({
      success: true,
      products: transformedProducts,
      supplier: {
        _id: supplier._id.toString(),
        id: supplier._id.toString(),
        companyName: supplier.companyName,
        contactPerson: supplier.contactPerson,
        userId: supplierUserId.toString()
      },
      message: 'Products retrieved successfully'
    });
  } catch (error) {
    console.error('Get supplier products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supplier products',
      error: error.message 
    });
  }
};


module.exports = {
  // Old functions for manager use
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
  getSupplierAnalytics,
  getSuppliersByStore,
  getSupplierProducts,
  debugStoreData,
  
  // New functions for supplier dashboard
  getDashboardStats,
  
  // Product Management
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  
  // Order Management
  getOrders,
  updateOrderStatus,
  updateDeliveryTime,
  
  // Utility
  getSupplierStores
}; 