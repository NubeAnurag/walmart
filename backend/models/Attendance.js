const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffProfile',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['present', 'absent', 'halfday'],
    default: 'absent'
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 500
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one record per staff per date
attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

// Index for efficient queries
attendanceSchema.index({ storeId: 1, date: 1 });
attendanceSchema.index({ userId: 1, date: 1 });

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Method to check if attendance is for a weekend
attendanceSchema.methods.isWeekend = function() {
  const dayOfWeek = this.date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
};

// Static method to get attendance for a date range
attendanceSchema.statics.getAttendanceForDateRange = async function(staffId, startDate, endDate) {
  return this.find({
    staffId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

// Static method to get monthly attendance statistics
attendanceSchema.statics.getMonthlyStats = async function(staffId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const stats = await this.aggregate([
    {
      $match: {
        staffId: new mongoose.Types.ObjectId(staffId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    present: 0,
    absent: 0,
    halfday: 0,
    total: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

module.exports = mongoose.model('Attendance', attendanceSchema); 