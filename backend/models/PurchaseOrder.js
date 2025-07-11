const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  orderDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'sent', 'confirmed', 'shipped', 'partially_delivered', 'delivered', 'completed', 'cancelled'],
    default: 'draft'
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    description: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    notes: String
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentTerms: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'partially_paid', 'paid', 'overdue'],
    default: 'pending'
  },
  notes: String,
  internalNotes: String,
  attachments: [{
    fileName: String,
    filePath: String,
    fileType: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  delivery: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    instructions: String,
    contactPerson: String,
    contactPhone: String
  },
  tracking: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
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
purchaseOrderSchema.index({ orderNumber: 1 });
purchaseOrderSchema.index({ supplierId: 1 });
purchaseOrderSchema.index({ storeId: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ orderDate: -1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });
purchaseOrderSchema.index({ createdBy: 1 });

// Pre-save middleware to generate order number
purchaseOrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Find the last order number for today
    const prefix = `PO${year}${month}${day}`;
    const lastOrder = await this.constructor.findOne({
      orderNumber: { $regex: `^${prefix}` }
    }).sort({ orderNumber: -1 });
    
    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
      sequence = lastSequence + 1;
    }
    
    this.orderNumber = `${prefix}${String(sequence).padStart(4, '0')}`;
  }
  next();
});

// Virtual for delivery status
purchaseOrderSchema.virtual('deliveryStatus').get(function() {
  if (this.status === 'delivered' || this.status === 'completed') return 'delivered';
  if (this.actualDeliveryDate) return 'delivered';
  if (this.status === 'shipped') return 'in_transit';
  if (this.expectedDeliveryDate && this.expectedDeliveryDate < new Date()) return 'overdue';
  return 'pending';
});

// Virtual for completion percentage
purchaseOrderSchema.virtual('completionPercentage').get(function() {
  if (this.items.length === 0) return 0;
  
  const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  const receivedItems = this.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  
  return Math.round((receivedItems / totalItems) * 100);
});

// Virtual for is overdue
purchaseOrderSchema.virtual('isOverdue').get(function() {
  return this.expectedDeliveryDate && 
         this.expectedDeliveryDate < new Date() && 
         !['delivered', 'completed', 'cancelled'].includes(this.status);
});

// Static method to find overdue orders
purchaseOrderSchema.statics.findOverdueOrders = function(storeId) {
  const now = new Date();
  return this.find({
    storeId,
    expectedDeliveryDate: { $lt: now },
    status: { $nin: ['delivered', 'completed', 'cancelled'] }
  }).populate('supplierId', 'companyName contactPerson')
    .sort({ expectedDeliveryDate: 1 });
};

// Static method to find pending orders
purchaseOrderSchema.statics.findPendingOrders = function(storeId) {
  return this.find({
    storeId,
    status: { $in: ['pending', 'approved', 'sent', 'confirmed'] }
  }).populate('supplierId', 'companyName contactPerson')
    .sort({ orderDate: -1 });
};

// Static method to find orders by status
purchaseOrderSchema.statics.findByStatus = function(storeId, status) {
  return this.find({ storeId, status })
    .populate('supplierId', 'companyName contactPerson')
    .populate('createdBy', 'firstName lastName')
    .sort({ orderDate: -1 });
};

// Instance method to calculate totals
purchaseOrderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.totalAmount = this.subtotal + this.taxAmount + this.shippingCost - this.discountAmount;
  return this;
};

// Instance method to approve order
purchaseOrderSchema.methods.approveOrder = function(approvedBy) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.addTracking('Order approved', 'Order has been approved and is ready to be sent', approvedBy);
  return this.save();
};

// Instance method to add tracking update
purchaseOrderSchema.methods.addTracking = function(status, notes, updatedBy) {
  this.tracking.push({
    status,
    notes,
    updatedBy,
    timestamp: new Date()
  });
  return this;
};

// Instance method to receive items
purchaseOrderSchema.methods.receiveItems = function(receivedItems, receivedBy) {
  let allItemsReceived = true;
  
  receivedItems.forEach(receivedItem => {
    const orderItem = this.items.id(receivedItem.itemId);
    if (orderItem) {
      orderItem.receivedQuantity = Math.min(
        orderItem.quantity, 
        (orderItem.receivedQuantity || 0) + receivedItem.quantity
      );
      
      if (orderItem.receivedQuantity < orderItem.quantity) {
        allItemsReceived = false;
      }
    }
  });
  
  // Update status based on received items
  if (allItemsReceived) {
    this.status = 'delivered';
    this.actualDeliveryDate = new Date();
    this.addTracking('Delivered', 'All items have been received', receivedBy);
  } else {
    this.status = 'partially_delivered';
    this.addTracking('Partially Delivered', 'Some items have been received', receivedBy);
  }
  
  return this.save();
};

// Instance method to complete order
purchaseOrderSchema.methods.completeOrder = function(completedBy) {
  this.status = 'completed';
  this.addTracking('Completed', 'Order has been completed', completedBy);
  return this.save();
};

// Instance method to cancel order
purchaseOrderSchema.methods.cancelOrder = function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.addTracking('Cancelled', reason || 'Order cancelled', cancelledBy);
  return this.save();
};

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

module.exports = PurchaseOrder; 