const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
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

// Index for better performance
storeSchema.index({ name: 1 });
storeSchema.index({ isActive: 1 });

// Static method to find active stores
storeSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to find store by name
storeSchema.statics.findByName = function(name) {
  return this.findOne({ name: new RegExp(name, 'i'), isActive: true });
};

const Store = mongoose.model('Store', storeSchema);

module.exports = Store; 