const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reorderLevel: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  maxStock: {
    type: Number,
    required: true,
    min: 0,
    default: 100
  },
  location: {
    aisle: String,
    shelf: String,
    bin: String,
    zone: String
  },
  lastRestocked: {
    type: Date,
    default: Date.now
  },
  lastSold: {
    type: Date
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stockMovements: [{
    type: {
      type: String,
      enum: ['in', 'out', 'adjustment', 'transfer'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reason: String,
    reference: String, // Order ID, Transfer ID, etc.
    timestamp: {
      type: Date,
      default: Date.now
    },
    performedBy: {
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

// Compound indexes for better performance
inventorySchema.index({ storeId: 1, productId: 1 }, { unique: true });
inventorySchema.index({ quantity: 1 });
inventorySchema.index({ reorderLevel: 1 });
inventorySchema.index({ updatedAt: -1 });

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.quantity === 0) return 'out_of_stock';
  if (this.quantity <= this.reorderLevel) return 'low_stock';
  if (this.quantity >= this.maxStock) return 'overstock';
  return 'in_stock';
});

// Virtual for turnover rate (placeholder - needs sales data)
inventorySchema.virtual('turnoverRate').get(function() {
  // This would be calculated based on sales data over time
  return 0; // Placeholder
});

// Static method to find low stock items
inventorySchema.statics.findLowStock = function(storeId) {
  return this.find({
    storeId,
    $expr: { $lte: ['$quantity', '$reorderLevel'] }
  }).populate('productId');
};

// Static method to find out of stock items
inventorySchema.statics.findOutOfStock = function(storeId) {
  return this.find({
    storeId,
    quantity: 0
  }).populate('productId');
};

// Static method to find overstocked items
inventorySchema.statics.findOverstock = function(storeId) {
  return this.find({
    storeId,
    $expr: { $gte: ['$quantity', '$maxStock'] }
  }).populate('productId');
};

// Instance method to add stock movement
inventorySchema.methods.addStockMovement = function(movement) {
  this.stockMovements.push(movement);
  this.updatedBy = movement.performedBy;
  
  // Update quantity based on movement type
  if (movement.type === 'in') {
    this.quantity += movement.quantity;
    this.lastRestocked = new Date();
  } else if (movement.type === 'out') {
    this.quantity = Math.max(0, this.quantity - movement.quantity);
    this.lastSold = new Date();
  } else if (movement.type === 'adjustment') {
    this.quantity = Math.max(0, movement.quantity);
  }
  
  return this.save();
};

// Instance method to check if reorder is needed
inventorySchema.methods.needsReorder = function() {
  return this.quantity <= this.reorderLevel;
};

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory; 