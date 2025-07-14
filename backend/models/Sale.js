const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String,
    category: String,
    barcode: String,
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
    costPrice: Number,
    profit: Number,
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed']
    }
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
  totalCost: Number,
  totalProfit: Number,
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'mobile_payment', 'gift_card', 'store_credit', 'mixed'],
    required: true
  },
  paymentDetails: {
    cardLast4: String,
    cardType: String,
    transactionRef: String,
    approvalCode: String
  },
  saleDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['completed', 'refunded', 'partially_refunded', 'cancelled'],
    default: 'completed'
  },
  refunds: [{
    items: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      quantity: Number,
      refundAmount: Number
    }],
    totalRefundAmount: Number,
    reason: String,
    refundDate: {
      type: Date,
      default: Date.now
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  saleType: {
    type: String,
    enum: ['regular', 'promotion', 'clearance', 'employee_discount', 'self_service'],
    default: 'regular'
  },
  channel: {
    type: String,
    enum: ['in_store', 'online', 'phone', 'kiosk'],
    default: 'in_store'
  },
  location: {
    register: String,
    department: String,
    aisle: String
  },
  customerInfo: {
    name: String,
    email: String,
    phone: String,
    loyaltyNumber: String,
    isNewCustomer: Boolean
  },
  notes: String,
  receiptNumber: String
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
saleSchema.index({ storeId: 1 });
saleSchema.index({ customerId: 1 });
saleSchema.index({ staffId: 1 });
saleSchema.index({ saleDate: -1 });
saleSchema.index({ status: 1 });
saleSchema.index({ paymentMethod: 1 });
saleSchema.index({ channel: 1 });
saleSchema.index({ 'items.productId': 1 });

// Pre-save middleware to generate transaction ID and calculate profits
saleSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Find the last transaction for today
    const prefix = `TXN${year}${month}${day}`;
    const lastSale = await this.constructor.findOne({
      transactionId: { $regex: `^${prefix}` }
    }).sort({ transactionId: -1 });
    
    let sequence = 1;
    if (lastSale) {
      const lastSequence = parseInt(lastSale.transactionId.slice(-6));
      sequence = lastSequence + 1;
    }
    
    this.transactionId = `${prefix}${String(sequence).padStart(6, '0')}`;
  }
  
  // Calculate totals and profits
  this.calculateTotals();
  
  next();
});

// Virtual for profit margin
saleSchema.virtual('profitMargin').get(function() {
  if (!this.totalCost || this.totalCost === 0) return 0;
  return ((this.totalProfit / this.totalAmount) * 100).toFixed(2);
});

// Virtual for items count
saleSchema.virtual('itemsCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual for unique products count
saleSchema.virtual('uniqueProductsCount').get(function() {
  return this.items.length;
});

// Static method to find sales by date range
saleSchema.statics.findByDateRange = function(storeId, startDate, endDate) {
  return this.find({
    storeId,
    saleDate: {
      $gte: startDate,
      $lte: endDate
    },
    status: { $ne: 'cancelled' }
  }).populate('items.productId', 'name category')
    .populate('staffId', 'userId employeeId')
    .sort({ saleDate: -1 });
};

// Static method to find top selling products
saleSchema.statics.findTopSellingProducts = function(storeId, startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        storeId: new mongoose.Types.ObjectId(storeId),
        saleDate: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.totalPrice' },
        totalProfit: { $sum: '$items.profit' },
        salesCount: { $sum: 1 },
        avgPrice: { $avg: '$items.unitPrice' }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' }
  ]);
};

// Static method to get sales analytics
saleSchema.statics.getSalesAnalytics = function(storeId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        storeId: new mongoose.Types.ObjectId(storeId),
        saleDate: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        totalProfit: { $sum: '$totalProfit' },
        totalItemsSold: { $sum: { $sum: '$items.quantity' } },
        avgTransactionValue: { $avg: '$totalAmount' },
        avgItemsPerTransaction: { $avg: { $sum: '$items.quantity' } }
      }
    }
  ]);
};

// Static method to get daily sales trend
saleSchema.statics.getDailySalesTrend = function(storeId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        storeId: new mongoose.Types.ObjectId(storeId),
        saleDate: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$saleDate' },
          month: { $month: '$saleDate' },
          day: { $dayOfMonth: '$saleDate' }
        },
        date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } } },
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        totalProfit: { $sum: '$totalProfit' },
        avgTransactionValue: { $avg: '$totalAmount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

// Static method to get category performance
saleSchema.statics.getCategoryPerformance = function(storeId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        storeId: new mongoose.Types.ObjectId(storeId),
        saleDate: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.totalPrice' },
        totalProfit: { $sum: '$items.profit' },
        avgPrice: { $avg: '$items.unitPrice' },
        salesCount: { $sum: 1 }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
};

// Instance method to calculate totals
saleSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;
  
  // Calculate total cost and profit
  this.totalCost = this.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
  this.totalProfit = this.items.reduce((sum, item) => sum + (item.profit || 0), 0);
  
  // Calculate profit for each item if not already set
  this.items.forEach(item => {
    if (item.costPrice && !item.profit) {
      item.profit = (item.unitPrice - item.costPrice) * item.quantity;
    }
  });
  
  return this;
};

// Instance method to process refund
saleSchema.methods.processRefund = function(refundData, processedBy) {
  this.refunds.push({
    ...refundData,
    refundDate: new Date(),
    processedBy
  });
  
  // Update status based on refund amount
  const totalRefunded = this.refunds.reduce((sum, refund) => sum + refund.totalRefundAmount, 0);
  
  if (totalRefunded >= this.totalAmount) {
    this.status = 'refunded';
  } else if (totalRefunded > 0) {
    this.status = 'partially_refunded';
  }
  
  return this.save();
};

const Sale = mongoose.model('Sale', saleSchema);

module.exports = Sale; 