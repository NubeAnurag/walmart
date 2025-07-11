const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    trim: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Clothing', 'Food', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Health', 'Automotive', 'Other']
  },
  brand: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  imageUrl: {
    type: String,
    default: null
  },
  specifications: {
    weight: String,
    dimensions: String,
    color: String,
    size: String,
    material: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ barcode: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ createdAt: -1 });

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  return ((this.price - this.costPrice) / this.costPrice * 100).toFixed(2);
});

// Static method to find active products
productSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

// Static method to find by category
productSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ name: 1 });
};

// Static method to search products
productSchema.statics.searchProducts = function(searchTerm) {
  return this.find({
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { brand: { $regex: searchTerm, $options: 'i' } },
      { barcode: { $regex: searchTerm, $options: 'i' } }
    ]
  }).sort({ name: 1 });
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 