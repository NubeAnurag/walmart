const mongoose = require('mongoose');

const staffProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    enum: ['Sales Associate', 'Cashier', 'Stock Clerk', 'Department Manager', 'Shift Supervisor', 'Customer Service', 'Security', 'Maintenance', 'Other']
  },
  department: {
    type: String,
    required: true,
    enum: ['Electronics', 'Clothing', 'Food', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Health', 'Automotive', 'Customer Service', 'General']
  },
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  hireDate: {
    type: Date,
    required: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  performance: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    lastReview: Date,
    nextReview: Date,
    goals: [String],
    achievements: [String],
    areas_for_improvement: [String]
  },
  attendance: {
    totalDaysWorked: {
      type: Number,
      default: 0
    },
    totalHoursWorked: {
      type: Number,
      default: 0
    },
    absences: {
      type: Number,
      default: 0
    },
    lateArrivals: {
      type: Number,
      default: 0
    },
    lastCheckIn: Date,
    lastCheckOut: Date
  },
  skills: [String],
  certifications: [{
    name: String,
    issuedBy: String,
    issuedDate: Date,
    expiryDate: Date,
    certificateId: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  terminationDate: Date,
  terminationReason: String
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
staffProfileSchema.index({ userId: 1 });
staffProfileSchema.index({ storeId: 1 });
staffProfileSchema.index({ employeeId: 1 });
staffProfileSchema.index({ department: 1 });
staffProfileSchema.index({ isActive: 1 });
staffProfileSchema.index({ managerId: 1 });

// Virtual for years of service
staffProfileSchema.virtual('yearsOfService').get(function() {
  const now = new Date();
  const hireDate = new Date(this.hireDate);
  return Math.floor((now - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual for attendance rate
staffProfileSchema.virtual('attendanceRate').get(function() {
  const totalExpectedDays = this.attendance.totalDaysWorked + this.attendance.absences;
  if (totalExpectedDays === 0) return 100;
  return ((this.attendance.totalDaysWorked / totalExpectedDays) * 100).toFixed(2);
});

// Virtual for punctuality rate
staffProfileSchema.virtual('punctualityRate').get(function() {
  const totalDays = this.attendance.totalDaysWorked;
  if (totalDays === 0) return 100;
  return (((totalDays - this.attendance.lateArrivals) / totalDays) * 100).toFixed(2);
});

// Static method to find active staff
staffProfileSchema.statics.findActiveStaff = function(storeId) {
  return this.find({ storeId, isActive: true })
    .populate('userId', 'firstName lastName email phone')
    .populate('managerId', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to find staff by department
staffProfileSchema.statics.findByDepartment = function(storeId, department) {
  return this.find({ storeId, department, isActive: true })
    .populate('userId', 'firstName lastName email phone')
    .sort({ 'performance.rating': -1 });
};

// Static method to find staff due for review
staffProfileSchema.statics.findDueForReview = function(storeId) {
  const today = new Date();
  return this.find({
    storeId,
    isActive: true,
    'performance.nextReview': { $lte: today }
  }).populate('userId', 'firstName lastName');
};

// Instance method to record attendance
staffProfileSchema.methods.recordCheckIn = function() {
  this.attendance.lastCheckIn = new Date();
  return this.save();
};

staffProfileSchema.methods.recordCheckOut = function() {
  this.attendance.lastCheckOut = new Date();
  
  // Calculate hours worked today
  if (this.attendance.lastCheckIn) {
    const hoursWorked = (this.attendance.lastCheckOut - this.attendance.lastCheckIn) / (1000 * 60 * 60);
    this.attendance.totalHoursWorked += hoursWorked;
    this.attendance.totalDaysWorked += 1;
  }
  
  return this.save();
};

// Instance method to update performance
staffProfileSchema.methods.updatePerformance = function(performanceData) {
  this.performance = { ...this.performance, ...performanceData };
  this.performance.lastReview = new Date();
  
  // Set next review date (6 months from now)
  const nextReview = new Date();
  nextReview.setMonth(nextReview.getMonth() + 6);
  this.performance.nextReview = nextReview;
  
  return this.save();
};

const StaffProfile = mongoose.model('StaffProfile', staffProfileSchema);

module.exports = StaffProfile; 