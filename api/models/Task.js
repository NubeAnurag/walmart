const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    trim: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffProfile',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'pending'
  },
  category: {
    type: String,
    enum: ['Inventory', 'Customer Service', 'Maintenance', 'Sales', 'Administrative', 'Training', 'Other'],
    default: 'Other'
  },
  dueDate: {
    type: Date,
    required: true
  },
  startDate: Date,
  completedDate: Date,
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0
  },
  location: {
    area: String,
    aisle: String,
    department: String,
    specific: String
  },
  requirements: [String],
  attachments: [{
    fileName: String,
    filePath: String,
    fileType: String,
    uploadedDate: {
      type: Date,
      default: Date.now
    }
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  subtasks: [{
    title: String,
    description: String,
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number, // Every X days/weeks/months/years
    daysOfWeek: [Number], // For weekly tasks (0-6, Sunday to Saturday)
    dayOfMonth: Number, // For monthly tasks
    endDate: Date
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
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ assignedBy: 1 });
taskSchema.index({ storeId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ category: 1 });
taskSchema.index({ createdAt: -1 });

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate < new Date() && this.status !== 'completed' && this.status !== 'cancelled';
});

// Virtual for completion percentage
taskSchema.virtual('completionPercentage').get(function() {
  if (this.subtasks.length === 0) return this.progress;
  
  const completedSubtasks = this.subtasks.filter(subtask => subtask.isCompleted).length;
  return Math.round((completedSubtasks / this.subtasks.length) * 100);
});

// Virtual for time to completion
taskSchema.virtual('timeToCompletion').get(function() {
  if (this.status !== 'completed' || !this.completedDate) return null;
  
  const start = this.startDate || this.createdAt;
  return Math.round((this.completedDate - start) / (1000 * 60 * 60)); // Hours
});

// Static method to find overdue tasks
taskSchema.statics.findOverdueTasks = function(storeId) {
  const now = new Date();
  return this.find({
    storeId,
    dueDate: { $lt: now },
    status: { $nin: ['completed', 'cancelled'] }
  }).populate('assignedTo', 'userId employeeId position')
    .populate('assignedBy', 'firstName lastName')
    .sort({ dueDate: 1 });
};

// Static method to find tasks by priority
taskSchema.statics.findByPriority = function(storeId, priority) {
  return this.find({
    storeId,
    priority,
    status: { $nin: ['completed', 'cancelled'] }
  }).populate('assignedTo', 'userId employeeId position')
    .sort({ dueDate: 1 });
};

// Static method to find tasks for a specific staff member
taskSchema.statics.findForStaff = function(staffId, status = null) {
  const query = { assignedTo: staffId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('assignedBy', 'firstName lastName')
    .sort({ dueDate: 1 });
};

// Static method to find tasks due today
taskSchema.statics.findDueToday = function(storeId) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  return this.find({
    storeId,
    dueDate: { $gte: startOfDay, $lt: endOfDay },
    status: { $nin: ['completed', 'cancelled'] }
  }).populate('assignedTo', 'userId employeeId position');
};

// Instance method to start task
taskSchema.methods.startTask = function() {
  this.status = 'in_progress';
  this.startDate = new Date();
  return this.save();
};

// Instance method to complete task
taskSchema.methods.completeTask = function(actualHours = null) {
  this.status = 'completed';
  this.completedDate = new Date();
  this.progress = 100;
  if (actualHours) this.actualHours = actualHours;
  
  // Mark all subtasks as completed
  this.subtasks.forEach(subtask => {
    if (!subtask.isCompleted) {
      subtask.isCompleted = true;
      subtask.completedAt = new Date();
    }
  });
  
  return this.save();
};

// Instance method to add note
taskSchema.methods.addNote = function(content, addedBy) {
  this.notes.push({
    content,
    addedBy,
    addedAt: new Date()
  });
  return this.save();
};

// Instance method to update progress
taskSchema.methods.updateProgress = function(progressPercentage) {
  this.progress = Math.max(0, Math.min(100, progressPercentage));
  
  if (this.progress === 100 && this.status !== 'completed') {
    this.completeTask();
  } else if (this.progress > 0 && this.status === 'pending') {
    this.status = 'in_progress';
    this.startDate = new Date();
  }
  
  return this.save();
};

// Instance method to add subtask
taskSchema.methods.addSubtask = function(subtaskData) {
  this.subtasks.push(subtaskData);
  return this.save();
};

// Instance method to complete subtask
taskSchema.methods.completeSubtask = function(subtaskId, completedBy) {
  const subtask = this.subtasks.id(subtaskId);
  if (subtask) {
    subtask.isCompleted = true;
    subtask.completedAt = new Date();
    subtask.completedBy = completedBy;
    
    // Update overall progress based on subtask completion
    const completionPercentage = this.completionPercentage;
    this.progress = completionPercentage;
    
    // If all subtasks completed, complete the main task
    if (completionPercentage === 100) {
      this.completeTask();
    }
  }
  return this.save();
};

const Task = mongoose.model('Task', taskSchema);

module.exports = Task; 