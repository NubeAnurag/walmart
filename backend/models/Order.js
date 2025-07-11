const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be a whole number'
    }
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0.01
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0.01
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: async function(v) {
        const User = mongoose.model('User');
        const customer = await User.findById(v);
        return customer && customer.role === 'customer';
      },
      message: 'Invalid customer ID'
    }
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: async function(v) {
        const User = mongoose.model('User');
        const supplier = await User.findById(v);
        return supplier && supplier.role === 'supplier';
      },
      message: 'Invalid supplier ID'
    }
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(v) {
        if (!v) return true; // Manager is optional
        const User = mongoose.model('User');
        const manager = await User.findById(v);
        return manager && manager.role === 'manager';
      },
      message: 'Invalid manager ID'
    }
  },
  managerName: {
    type: String,
    trim: true,
    default: 'Not Assigned'
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0.01
  },
  status: {
    type: String,
    enum: ['Order Received', 'Order Completed', 'Order Rejected'],
    default: 'Order Received'
  },
  estimatedDeliveryTime: {
    type: Date,
    validate: {
      validator: function(v) {
        if (this.status === 'Order Rejected') return true; // No validation for rejected orders
        return v && v > new Date();
      },
      message: 'Estimated delivery time must be in the future'
    }
  },
  actualDeliveryTime: {
    type: Date
  },
  shippingAddress: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'United States' }
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer', 'Cash on Delivery'],
    default: 'Credit Card'
  },
  notes: {
    supplier: { type: String, trim: true, maxlength: 500 },
    customer: { type: String, trim: true, maxlength: 500 },
    internal: { type: String, trim: true, maxlength: 500 }
  },
  tracking: {
    trackingNumber: { type: String, trim: true },
    carrier: { type: String, trim: true },
    trackingUrl: { type: String, trim: true }
  },
  timeline: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: { type: String, trim: true }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ supplierId: 1 });
orderSchema.index({ storeId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ estimatedDeliveryTime: 1 });
orderSchema.index({ totalAmount: 1 });

// Pre-save middleware to generate order number if not provided
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber && this.isNew) {
    const count = await this.constructor.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    this.orderNumber = `ORD-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
  }
  
  // Add timeline entry for status changes
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      status: this.status,
      updatedBy: this.supplierId, // Default to supplier, should be passed from controller
      notes: `Status changed to ${this.status}`
    });
  }
  
  next();
});

// Pre-save middleware to calculate total amount
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
  }
  next();
});

// Static methods
orderSchema.statics.findBySupplier = function(supplierId, options = {}) {
  const query = { supplierId, isActive: true };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.storeId) {
    query.storeId = options.storeId;
  }
  
  if (options.dateFrom || options.dateTo) {
    query.createdAt = {};
    if (options.dateFrom) query.createdAt.$gte = new Date(options.dateFrom);
    if (options.dateTo) query.createdAt.$lte = new Date(options.dateTo);
  }
  
  return this.find(query)
    .populate('customerId', 'firstName lastName email phone')
    .populate('storeId', 'name storeCode address phone')
    .populate('managerId', 'firstName lastName email')
    .populate('items.productId', 'name image sku')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50);
};

orderSchema.statics.findByCustomer = function(customerId, options = {}) {
  const query = { customerId, isActive: true };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('supplierId', 'firstName lastName email')
    .populate('storeId', 'name storeCode')
    .populate('items.productId', 'name image sku')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50);
};

orderSchema.statics.findByStore = function(storeId, options = {}) {
  const query = { storeId, isActive: true };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('customerId', 'firstName lastName email')
    .populate('supplierId', 'firstName lastName email')
    .populate('managerId', 'firstName lastName email')
    .populate('items.productId', 'name image sku')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50);
};

orderSchema.statics.getOrderStats = function(supplierId, timeframe = '30d') {
  const startDate = new Date();
  if (timeframe === '7d') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (timeframe === '30d') {
    startDate.setDate(startDate.getDate() - 30);
  } else if (timeframe === '90d') {
    startDate.setDate(startDate.getDate() - 90);
  }
  
  return this.aggregate([
    {
      $match: {
        supplierId: new mongoose.Types.ObjectId(supplierId),
        createdAt: { $gte: startDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        avgOrderValue: { $avg: '$totalAmount' }
      }
    }
  ]);
};

// Instance methods
orderSchema.methods.updateStatus = function(newStatus, updatedBy, notes = '') {
  this.status = newStatus;
  
  if (newStatus === 'Order Rejected') {
    this.estimatedDeliveryTime = null;
  } else if (newStatus === 'Order Completed') {
    this.actualDeliveryTime = new Date();
  }
  
  this.timeline.push({
    status: newStatus,
    updatedBy: updatedBy,
    notes: notes || `Status updated to ${newStatus}`
  });
  
  return this.save();
};

orderSchema.methods.updateDeliveryTime = function(newDeliveryTime, updatedBy) {
  if (this.status === 'Order Rejected') {
    throw new Error('Cannot update delivery time for rejected orders');
  }
  
  if (new Date(newDeliveryTime) <= new Date()) {
    throw new Error('Delivery time must be in the future');
  }
  
  this.estimatedDeliveryTime = new Date(newDeliveryTime);
  
  this.timeline.push({
    status: this.status,
    updatedBy: updatedBy,
    notes: `Delivery time updated to ${newDeliveryTime}`
  });
  
  return this.save();
};

orderSchema.methods.addTrackingInfo = function(trackingNumber, carrier, trackingUrl = '') {
  this.tracking = {
    trackingNumber,
    carrier,
    trackingUrl
  };
  
  return this.save();
};

orderSchema.methods.canBeModified = function() {
  return this.status === 'Order Received';
};

orderSchema.methods.getTotalItems = function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 