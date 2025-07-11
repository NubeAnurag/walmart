const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password not required if Google OAuth user
    },
    minlength: 6
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  avatar: {
    type: String, // URL to user's profile picture
    default: null
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  role: {
    type: String,
    required: true,
    enum: ['customer', 'manager', 'staff', 'supplier', 'admin'],
    default: 'customer'
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    required: function() {
      return ['manager', 'staff'].includes(this.role);
    }
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: function() {
      return ['manager', 'staff'].includes(this.role);
    }
  },
  storeIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Store',
    required: function() {
      return this.role === 'supplier';
    },
    validate: {
      validator: function(v) {
        return this.role !== 'supplier' || (Array.isArray(v) && v.length > 0);
      },
      message: 'Suppliers must be associated with at least one store'
    }
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
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
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      return ret;
    }
  }
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ storeId: 1 });
userSchema.index({ employeeId: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new) and password exists
  if (!this.isModified('password') || !this.password) return next();

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to verify password
userSchema.methods.verifyPassword = async function(plainPassword) {
  if (!this.password) return false; // No password set for OAuth users
  return await bcrypt.compare(plainPassword, this.password);
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

// Static method to find user by Google ID
userSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId, isActive: true });
};

// Static method to find user by ID
userSchema.statics.findByIdActive = function(id) {
  return this.findOne({ _id: id, isActive: true }).select('-password');
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true }).select('-password').sort({ createdAt: -1 });
};

// Static method to find users by store
userSchema.statics.findByStore = function(storeId) {
  return this.find({ storeId, isActive: true }).select('-password').populate('storeId').sort({ createdAt: -1 });
};

// Static method to deactivate user (soft delete)
userSchema.statics.deactivateUser = function(id) {
  return this.findByIdAndUpdate(
    id, 
    { isActive: false }, 
    { new: true }
  ).select('-password');
};

// Static method to update user profile
userSchema.statics.updateProfile = function(id, updateData) {
  const allowedUpdates = ['firstName', 'lastName', 'phone'];
  const filteredData = {};
  
  Object.keys(updateData).forEach(key => {
    if (allowedUpdates.includes(key)) {
      filteredData[key] = updateData[key];
    }
  });

  return this.findByIdAndUpdate(
    id,
    filteredData,
    { new: true, runValidators: true }
  ).select('-password');
};

const User = mongoose.model('User', userSchema);

module.exports = User; 