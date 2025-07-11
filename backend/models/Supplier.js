const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true // Suppliers might not have user accounts
  },
  companyName: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  contactPerson: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    title: String,
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    mobile: String
  },
  companyInfo: {
    taxId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    website: String,
    industry: String,
    establishedYear: Number,
    employeeCount: String,
    annualRevenue: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'USA'
    }
  },
  businessDetails: {
    paymentTerms: {
      type: String,
      enum: ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'COD', 'Prepaid'],
      default: 'Net 30'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    creditLimit: {
      type: Number,
      default: 0
    },
    shippingMethods: [String],
    deliveryTimeframe: String,
    minimumOrderAmount: Number
  },
  performance: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    completedOrders: {
      type: Number,
      default: 0
    },
    cancelledOrders: {
      type: Number,
      default: 0
    },
    averageDeliveryTime: {
      type: Number,
      default: 0 // in days
    },
    onTimeDeliveryRate: {
      type: Number,
      default: 100 // percentage
    },
    qualityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    lastOrderDate: Date,
    totalValue: {
      type: Number,
      default: 0
    }
  },
  categories: [{
    type: String,
    enum: ['Electronics', 'Clothing', 'Food', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Health', 'Automotive', 'Other']
  }],
  certifications: [{
    name: String,
    certifyingBody: String,
    issuedDate: Date,
    expiryDate: Date,
    certificateNumber: String
  }],
  bankingInfo: {
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    accountType: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date,
  notes: [String],
  tags: [String]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      // Remove sensitive banking info from JSON output
      if (ret.bankingInfo) {
        delete ret.bankingInfo.accountNumber;
        delete ret.bankingInfo.routingNumber;
      }
      return ret;
    }
  }
});

// Indexes for better performance
supplierSchema.index({ companyName: 1 });
supplierSchema.index({ 'contactPerson.email': 1 });
supplierSchema.index({ 'companyInfo.taxId': 1 });
supplierSchema.index({ isActive: 1 });
supplierSchema.index({ isApproved: 1 });
supplierSchema.index({ categories: 1 });
supplierSchema.index({ 'performance.rating': -1 });

// Virtual for completion rate
supplierSchema.virtual('completionRate').get(function() {
  if (this.performance.totalOrders === 0) return 100;
  return ((this.performance.completedOrders / this.performance.totalOrders) * 100).toFixed(2);
});

// Virtual for reliability score
supplierSchema.virtual('reliabilityScore').get(function() {
  const completionRate = parseFloat(this.completionRate);
  const onTimeRate = this.performance.onTimeDeliveryRate;
  const qualityRating = this.performance.qualityRating;
  
  // Weighted average: 40% completion, 35% on-time delivery, 25% quality
  return ((completionRate * 0.4) + (onTimeRate * 0.35) + (qualityRating * 20 * 0.25)).toFixed(2);
});

// Static method to find active suppliers
supplierSchema.statics.findActiveSuppliers = function() {
  return this.find({ isActive: true, isApproved: true }).sort({ 'performance.rating': -1 });
};

// Static method to find suppliers by category
supplierSchema.statics.findByCategory = function(category) {
  return this.find({ 
    categories: category, 
    isActive: true, 
    isApproved: true 
  }).sort({ 'performance.rating': -1 });
};

// Static method to find top-rated suppliers
supplierSchema.statics.findTopRated = function(limit = 10) {
  return this.find({ isActive: true, isApproved: true })
    .sort({ 'performance.rating': -1 })
    .limit(limit);
};

// Static method to find suppliers needing attention
supplierSchema.statics.findNeedingAttention = function() {
  return this.find({
    isActive: true,
    isApproved: true,
    $or: [
      { 'performance.rating': { $lt: 3 } },
      { 'performance.onTimeDeliveryRate': { $lt: 80 } },
      { 'performance.qualityRating': { $lt: 3 } }
    ]
  });
};

// Instance method to update performance metrics
supplierSchema.methods.updatePerformance = function(orderData) {
  this.performance.totalOrders += 1;
  
  if (orderData.status === 'completed') {
    this.performance.completedOrders += 1;
    this.performance.lastOrderDate = new Date();
    this.performance.totalValue += orderData.totalAmount;
    
    if (orderData.deliveryTime) {
      // Update average delivery time
      const currentAvg = this.performance.averageDeliveryTime;
      const totalCompleted = this.performance.completedOrders;
      this.performance.averageDeliveryTime = 
        ((currentAvg * (totalCompleted - 1)) + orderData.deliveryTime) / totalCompleted;
    }
    
    if (orderData.wasOnTime !== undefined) {
      // Update on-time delivery rate
      const onTimeDeliveries = Math.round((this.performance.onTimeDeliveryRate / 100) * (this.performance.completedOrders - 1));
      const newOnTimeDeliveries = onTimeDeliveries + (orderData.wasOnTime ? 1 : 0);
      this.performance.onTimeDeliveryRate = (newOnTimeDeliveries / this.performance.completedOrders) * 100;
    }
    
    if (orderData.qualityRating) {
      // Update quality rating (weighted average)
      const currentRating = this.performance.qualityRating;
      const totalCompleted = this.performance.completedOrders;
      this.performance.qualityRating = 
        ((currentRating * (totalCompleted - 1)) + orderData.qualityRating) / totalCompleted;
    }
  } else if (orderData.status === 'cancelled') {
    this.performance.cancelledOrders += 1;
  }
  
  // Recalculate overall rating
  this.calculateOverallRating();
  
  return this.save();
};

// Instance method to calculate overall rating
supplierSchema.methods.calculateOverallRating = function() {
  const completionRate = parseFloat(this.completionRate) / 100;
  const onTimeRate = this.performance.onTimeDeliveryRate / 100;
  const qualityRating = this.performance.qualityRating / 5;
  
  // Weighted calculation: 30% completion, 40% on-time, 30% quality
  this.performance.rating = (completionRate * 1.5) + (onTimeRate * 2) + (qualityRating * 1.5);
  this.performance.rating = Math.max(1, Math.min(5, this.performance.rating));
};

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier; 