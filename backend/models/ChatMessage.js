const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  // User who sent the message
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Chat session identifier
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // Message content
  message: {
    type: String,
    required: true,
    trim: true
  },
  
  // Who sent the message: 'user' or 'bot'
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  
  // Message type for different kinds of responses
  messageType: {
    type: String,
    enum: ['text', 'product_recommendation', 'product_search', 'order_status', 'help', 'error', 'store_info', 'greeting', 'goodbye', 'unknown'],
    default: 'text'
  },
  
  // Metadata for structured responses
  metadata: {
    // For product recommendations
    products: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      name: String,
      price: Number,
      image: String
    }],
    
    // For order status
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    
    // For help topics
    helpCategory: String,
    
    // AI confidence score
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    
    // Intent detected by AI
    intent: String,
    
    // Entities extracted - flexible handling to avoid validation errors
    entities: {
      type: mongoose.Schema.Types.Mixed,
      default: []
    }
  },
  
  // Response time in milliseconds
  responseTime: {
    type: Number
  },
  
  // Whether the message was helpful (user feedback)
  helpful: {
    type: Boolean,
    default: null
  },
  
  // Rating for bot responses (1-5)
  rating: {
    type: Number,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

// Indexes for better performance
chatMessageSchema.index({ userId: 1, sessionId: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, messageType: 1 });
chatMessageSchema.index({ createdAt: -1 });

// Virtual for formatted timestamp
chatMessageSchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleTimeString();
});

// Static method to get chat history
chatMessageSchema.statics.getChatHistory = async function(userId, sessionId, limit = 50) {
  return this.find({ userId, sessionId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('metadata.products.productId', 'name price image category')
    .populate('metadata.orderId', 'orderNumber status totalAmount')
    .lean();
};

// Static method to create a new chat session
chatMessageSchema.statics.createSession = function() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Instance method to mark as helpful
chatMessageSchema.methods.markAsHelpful = function(isHelpful) {
  this.helpful = isHelpful;
  return this.save();
};

// Instance method to rate the response
chatMessageSchema.methods.rateResponse = function(rating) {
  this.rating = rating;
  return this.save();
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema); 