const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 2500
  },
  price: {
    type: Number,
    required: true,
    min: 0.01,
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Price must be greater than 0'
    }
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Electronics',
      'Clothing',
      'Furniture',
      'Home & Garden',
      'Sports & Outdoors',
      'Health & Beauty',
      'Books',
      'Toys & Games',
      'Automotive',
      'Food & Beverages',
      'Office Supplies',
      'Pet Supplies',
      'Baby & Kids',
      'Tools & Hardware',
      'Other'
    ]
  },
  brand: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Stock must be a whole number'
    }
  },
  image: {
    url: {
      type: String,
      default: null,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow null/empty
          // Allow Cloudinary URLs and regular HTTP/HTTPS URLs
          const isUrl = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v) || 
                       /^https:\/\/res\.cloudinary\.com\//.test(v);
          return isUrl;
        },
        message: 'Image URL must be a valid HTTP/HTTPS URL'
      }
    },
    publicId: {
      type: String,
      default: null,
      trim: true
    },
    format: {
      type: String,
      default: null,
      trim: true
    },
    width: {
      type: Number,
      default: null,
      min: 0
    },
    height: {
      type: Number,
      default: null,
      min: 0
    },
    bytes: {
      type: Number,
      default: null,
      min: 0
    }
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
  storeIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  }],
  sku: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true,
    maxlength: 50
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    weight: { type: Number, min: 0 }
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
productSchema.index({ supplierId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ isActive: 1 });
productSchema.index({ storeIds: 1 });
productSchema.index({ price: 1 });
productSchema.index({ stock: 1 });

// Pre-save middleware to generate SKU if not provided
productSchema.pre('save', async function(next) {
  if (!this.sku && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.sku = `PRD-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Static methods
productSchema.statics.findBySupplier = function(supplierId, options = {}) {
  const query = { supplierId, isActive: true };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.search) {
    query.$text = { $search: options.search };
  }
  
  if (options.minPrice || options.maxPrice) {
    query.price = {};
    if (options.minPrice) query.price.$gte = options.minPrice;
    if (options.maxPrice) query.price.$lte = options.maxPrice;
  }
  
  return this.find(query)
    .populate('storeIds', 'name storeCode')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50);
};

productSchema.statics.findByStore = function(storeId, options = {}) {
  const query = { storeIds: storeId, isActive: true };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.search) {
    query.$text = { $search: options.search };
  }
  
  return this.find(query)
    .populate('supplierId', 'firstName lastName email')
    .populate('storeIds', 'name storeCode')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50);
};

productSchema.statics.updateStock = function(productId, quantity, operation = 'subtract') {
  const update = operation === 'add' 
    ? { $inc: { stock: Math.abs(quantity) } }
    : { $inc: { stock: -Math.abs(quantity) } };
  
  return this.findByIdAndUpdate(
    productId,
    update,
    { new: true, runValidators: true }
  );
};

// Instance methods
productSchema.methods.updateRating = async function(newRating) {
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

productSchema.methods.isInStock = function() {
  return this.stock > 0;
};

productSchema.methods.canFulfillOrder = function(quantity) {
  return this.stock >= quantity;
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 