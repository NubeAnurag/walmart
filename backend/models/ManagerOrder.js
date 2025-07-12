const mongoose = require('mongoose');

const managerOrderItemSchema = new mongoose.Schema({
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
  productImage: {
    type: String,
    default: null
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

const managerOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: async function(v) {
        const User = mongoose.model('User');
        const manager = await User.findById(v);
        return manager && manager.role === 'manager';
      },
      message: 'Invalid manager ID'
    }
  },
  managerName: {
    type: String,
    required: true,
    trim: true
  },
  managerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
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
  supplierName: {
    type: String,
    required: true,
    trim: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  items: [managerOrderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0.01
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expectedDeliveryDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (this.status === 'rejected' || this.status === 'cancelled') return true;
        return v && v > new Date();
      },
      message: 'Expected delivery date must be in the future'
    }
  },
  actualDeliveryDate: {
    type: Date
  },
  notes: {
    manager: { type: String, trim: true, maxlength: 500 },
    supplier: { type: String, trim: true, maxlength: 500 }
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
managerOrderSchema.index({ orderNumber: 1 });
managerOrderSchema.index({ managerId: 1 });
managerOrderSchema.index({ supplierId: 1 });
managerOrderSchema.index({ storeId: 1 });
managerOrderSchema.index({ status: 1 });
managerOrderSchema.index({ orderDate: -1 });
managerOrderSchema.index({ expectedDeliveryDate: 1 });

// Pre-save middleware to generate order number if not provided
managerOrderSchema.pre('save', async function(next) {
  if (!this.orderNumber && this.isNew) {
    const count = await this.constructor.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    this.orderNumber = `MO-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
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
managerOrderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
  }
  next();
});

// Static methods
managerOrderSchema.statics.findByManager = function(managerId, options = {}) {
  const query = { managerId, isActive: true };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.supplierId) {
    query.supplierId = options.supplierId;
  }
  
  if (options.dateFrom || options.dateTo) {
    query.orderDate = {};
    if (options.dateFrom) query.orderDate.$gte = new Date(options.dateFrom);
    if (options.dateTo) query.orderDate.$lte = new Date(options.dateTo);
  }
  
  return this.find(query)
    .populate('supplierId', 'firstName lastName email companyName')
    .populate('storeId', 'name storeCode address')
    .populate('items.productId', 'name image sku category')
    .sort(options.sort || { orderDate: -1 })
    .limit(options.limit || 50);
};

managerOrderSchema.statics.findBySupplier = function(supplierId, options = {}) {
  const query = { supplierId, isActive: true };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.storeId) {
    query.storeId = options.storeId;
  }
  
  if (options.dateFrom || options.dateTo) {
    query.orderDate = {};
    if (options.dateFrom) query.orderDate.$gte = new Date(options.dateFrom);
    if (options.dateTo) query.orderDate.$lte = new Date(options.dateTo);
  }
  
  return this.find(query)
    .populate('managerId', 'firstName lastName email')
    .populate('storeId', 'name storeCode address')
    .populate('items.productId', 'name image sku category')
    .sort(options.sort || { orderDate: -1 })
    .limit(options.limit || 50);
};

managerOrderSchema.statics.findByStore = function(storeId, options = {}) {
  const query = { storeId, isActive: true };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.supplierId) {
    query.supplierId = options.supplierId;
  }
  
  return this.find(query)
    .populate('managerId', 'firstName lastName email')
    .populate('supplierId', 'firstName lastName email companyName')
    .populate('items.productId', 'name image sku category')
    .sort(options.sort || { orderDate: -1 })
    .limit(options.limit || 50);
};

// Instance methods
managerOrderSchema.methods.updateStatus = function(newStatus, updatedBy, notes = '') {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    updatedBy: updatedBy,
    notes: notes
  });
  return this.save();
};

module.exports = mongoose.model('ManagerOrder', managerOrderSchema); 