const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  reportType: {
    type: String,
    required: true,
    enum: ['sales', 'inventory', 'staff', 'supplier', 'customer', 'financial', 'performance', 'custom']
  },
  category: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom_period', 'real_time']
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  description: String,
  parameters: {
    dateRange: {
      startDate: Date,
      endDate: Date
    },
    filters: {
      departments: [String],
      categories: [String],
      suppliers: [String],
      staff: [String],
      products: [String],
      customFilters: mongoose.Schema.Types.Mixed
    },
    metrics: [String],
    groupBy: [String],
    sortBy: String,
    sortOrder: {
      type: String,
      enum: ['asc', 'desc'],
      default: 'desc'
    }
  },
  data: {
    summary: mongoose.Schema.Types.Mixed,
    details: mongoose.Schema.Types.Mixed,
    charts: [{
      type: String,
      title: String,
      data: mongoose.Schema.Types.Mixed,
      config: mongoose.Schema.Types.Mixed
    }],
    tables: [{
      title: String,
      headers: [String],
      rows: mongoose.Schema.Types.Mixed
    }]
  },
  format: {
    type: String,
    enum: ['pdf', 'excel', 'csv', 'json', 'html'],
    default: 'pdf'
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed', 'archived'],
    default: 'generating'
  },
  file: {
    filename: String,
    path: String,
    size: Number,
    mimeType: String,
    downloadCount: {
      type: Number,
      default: 0
    },
    lastDownloaded: Date
  },
  schedule: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly']
    },
    dayOfWeek: Number, // 0-6 for weekly
    dayOfMonth: Number, // 1-31 for monthly
    time: String, // HH:MM format
    nextRun: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    emailRecipients: [String]
  },
  sharing: {
    isPublic: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['view', 'download', 'edit'],
        default: 'view'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      }
    }],
    shareToken: String,
    expiresAt: Date
  },
  performance: {
    generationTime: Number, // in milliseconds
    dataSize: Number, // in bytes
    recordsProcessed: Number
  },
  error: {
    message: String,
    stack: String,
    timestamp: Date
  },
  tags: [String],
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateName: String,
  expiresAt: Date // Auto-delete after certain period
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
reportSchema.index({ reportType: 1 });
reportSchema.index({ generatedBy: 1 });
reportSchema.index({ storeId: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ 'schedule.nextRun': 1 });
reportSchema.index({ 'schedule.isActive': 1 });
reportSchema.index({ isTemplate: 1 });
reportSchema.index({ expiresAt: 1 }); // For TTL

// TTL index to auto-delete expired reports
reportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for file size in human readable format
reportSchema.virtual('fileSizeFormatted').get(function() {
  if (!this.file.size) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(this.file.size) / Math.log(1024));
  return Math.round(this.file.size / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for generation time in human readable format
reportSchema.virtual('generationTimeFormatted').get(function() {
  if (!this.performance.generationTime) return '0s';
  
  const seconds = this.performance.generationTime / 1000;
  if (seconds < 1) return `${this.performance.generationTime}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
});

// Virtual for age of report
reportSchema.virtual('age').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffInHours = (now - created) / (1000 * 60 * 60);
  
  if (diffInHours < 1) return 'Less than 1 hour';
  if (diffInHours < 24) return `${Math.floor(diffInHours)} hours`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day';
  if (diffInDays < 30) return `${diffInDays} days`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) return '1 month';
  return `${diffInMonths} months`;
});

// Static method to find reports by type
reportSchema.statics.findByType = function(storeId, reportType, limit = 10) {
  return this.find({ storeId, reportType, status: 'completed' })
    .populate('generatedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find scheduled reports
reportSchema.statics.findScheduledReports = function(storeId) {
  return this.find({
    storeId,
    'schedule.isScheduled': true,
    'schedule.isActive': true
  }).populate('generatedBy', 'firstName lastName email');
};

// Static method to find reports due for generation
reportSchema.statics.findDueReports = function() {
  const now = new Date();
  return this.find({
    'schedule.isScheduled': true,
    'schedule.isActive': true,
    'schedule.nextRun': { $lte: now }
  });
};

// Static method to find recent reports
reportSchema.statics.findRecentReports = function(storeId, limit = 10) {
  return this.find({ storeId, status: 'completed' })
    .populate('generatedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find popular reports (most downloaded)
reportSchema.statics.findPopularReports = function(storeId, limit = 5) {
  return this.find({ storeId, status: 'completed' })
    .populate('generatedBy', 'firstName lastName')
    .sort({ 'file.downloadCount': -1 })
    .limit(limit);
};

// Instance method to mark as completed
reportSchema.methods.markCompleted = function(fileInfo, performanceData) {
  this.status = 'completed';
  this.file = { ...this.file, ...fileInfo };
  this.performance = { ...this.performance, ...performanceData };
  return this.save();
};

// Instance method to mark as failed
reportSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.error = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date()
  };
  return this.save();
};

// Instance method to record download
reportSchema.methods.recordDownload = function() {
  this.file.downloadCount = (this.file.downloadCount || 0) + 1;
  this.file.lastDownloaded = new Date();
  return this.save();
};

// Instance method to share report
reportSchema.methods.shareWith = function(userId, permission = 'view') {
  // Remove existing share for this user
  this.sharing.sharedWith = this.sharing.sharedWith.filter(
    share => !share.userId.equals(userId)
  );
  
  // Add new share
  this.sharing.sharedWith.push({
    userId,
    permission,
    sharedAt: new Date()
  });
  
  return this.save();
};

// Instance method to generate share token
reportSchema.methods.generateShareToken = function(expirationDays = 7) {
  const crypto = require('crypto');
  this.sharing.shareToken = crypto.randomBytes(32).toString('hex');
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);
  this.sharing.expiresAt = expiresAt;
  
  return this.save();
};

// Instance method to schedule report
reportSchema.methods.scheduleReport = function(scheduleData) {
  this.schedule = {
    ...this.schedule,
    ...scheduleData,
    isScheduled: true,
    isActive: true
  };
  
  // Calculate next run date
  this.calculateNextRun();
  
  return this.save();
};

// Instance method to calculate next run date
reportSchema.methods.calculateNextRun = function() {
  if (!this.schedule.isScheduled) return;
  
  const now = new Date();
  let nextRun = new Date(now);
  
  switch (this.schedule.frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      const targetDay = this.schedule.dayOfWeek || 0;
      const currentDay = nextRun.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      break;
    case 'monthly':
      const targetDate = this.schedule.dayOfMonth || 1;
      nextRun.setMonth(nextRun.getMonth() + 1);
      nextRun.setDate(targetDate);
      break;
    case 'quarterly':
      nextRun.setMonth(nextRun.getMonth() + 3);
      break;
  }
  
  // Set time if specified
  if (this.schedule.time) {
    const [hours, minutes] = this.schedule.time.split(':');
    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }
  
  this.schedule.nextRun = nextRun;
};

const Report = mongoose.model('Report', reportSchema);

module.exports = Report; 