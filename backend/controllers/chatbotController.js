const ChatMessage = require('../models/ChatMessage');
const aiService = require('../services/aiService');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

class ChatbotController {
  // Send a message to the chatbot
  static async sendMessage(req, res) {
    try {
      const { message, sessionId } = req.body;
      const userId = req.user._id;

      console.log('💬 Chatbot: Received message:', { userId, sessionId, message });

      // Validate input
      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message cannot be empty'
        });
      }

      // Create or validate session
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = ChatMessage.createSession();
      }

      // Save user message
      const userMessage = new ChatMessage({
        userId,
        sessionId: currentSessionId,
        message: message.trim(),
        sender: 'user',
        messageType: 'text'
      });

      await userMessage.save();

      // Get user context for better responses
      const userContext = await ChatbotController.getUserContext(userId);

      // Generate AI response
      const aiResponse = await aiService.generateChatResponse(
        message.trim(),
        userId,
        userContext
      );

      // Temporarily disable entities completely to isolate the issue
      const cleanEntities = [];

      // Create clean metadata object without spreading to avoid reference issues
      const cleanMetadata = {
        intent: aiResponse.metadata.intent,
        confidence: aiResponse.metadata.confidence,
        entities: cleanEntities || [], // Ensure it's always an array
        responseTime: aiResponse.metadata.responseTime
      };

      // Add optional fields if they exist
      if (aiResponse.metadata.products) {
        cleanMetadata.products = aiResponse.metadata.products;
      }
      if (aiResponse.metadata.orderId) {
        cleanMetadata.orderId = aiResponse.metadata.orderId;
      }
      if (aiResponse.metadata.stores) {
        cleanMetadata.stores = aiResponse.metadata.stores;
      }

      // Save bot response
      const botMessage = new ChatMessage({
        userId,
        sessionId: currentSessionId,
        message: aiResponse.message,
        sender: 'bot',
        messageType: aiResponse.messageType,
        metadata: cleanMetadata,
        responseTime: aiResponse.metadata.responseTime
      });

      await botMessage.save();

      console.log('✅ Chatbot: Response generated successfully');

      res.json({
        success: true,
        data: {
          sessionId: currentSessionId,
          userMessage: {
            id: userMessage._id,
            message: userMessage.message,
            sender: userMessage.sender,
            timestamp: userMessage.createdAt
          },
          botResponse: {
            id: botMessage._id,
            message: botMessage.message,
            sender: botMessage.sender,
            messageType: botMessage.messageType,
            metadata: botMessage.metadata,
            timestamp: botMessage.createdAt
          }
        }
      });

    } catch (error) {
      console.error('❌ Chatbot send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process message',
        error: error.message
      });
    }
  }

  // Get chat history for a session
  static async getChatHistory(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user._id;
      const limit = parseInt(req.query.limit) || 50;

      console.log('📜 Chatbot: Getting chat history:', { userId, sessionId, limit });

      const chatHistory = await ChatMessage.getChatHistory(userId, sessionId, limit);

      // Reverse to get chronological order (oldest first)
      const messages = chatHistory.reverse().map(msg => ({
        id: msg._id,
        message: msg.message,
        sender: msg.sender,
        messageType: msg.messageType,
        metadata: msg.metadata,
        timestamp: msg.createdAt,
        helpful: msg.helpful,
        rating: msg.rating
      }));

      res.json({
        success: true,
        data: {
          sessionId,
          messages,
          totalMessages: messages.length
        }
      });

    } catch (error) {
      console.error('❌ Chatbot get history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get chat history',
        error: error.message
      });
    }
  }

  // Get all chat sessions for a user
  static async getChatSessions(req, res) {
    try {
      const userId = req.user._id;
      const limit = parseInt(req.query.limit) || 10;

      console.log('📋 Chatbot: Getting chat sessions:', { userId, limit });

      // Get distinct sessions with their latest message
      const sessions = await ChatMessage.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$sessionId',
            lastMessage: { $last: '$message' },
            lastMessageTime: { $last: '$createdAt' },
            messageCount: { $sum: 1 },
            lastSender: { $last: '$sender' }
          }
        },
        { $sort: { lastMessageTime: -1 } },
        { $limit: limit }
      ]);

      const formattedSessions = sessions.map(session => ({
        sessionId: session._id,
        lastMessage: session.lastMessage,
        lastMessageTime: session.lastMessageTime,
        messageCount: session.messageCount,
        lastSender: session.lastSender
      }));

      res.json({
        success: true,
        data: {
          sessions: formattedSessions,
          totalSessions: formattedSessions.length
        }
      });

    } catch (error) {
      console.error('❌ Chatbot get sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get chat sessions',
        error: error.message
      });
    }
  }

  // Create a new chat session
  static async createSession(req, res) {
    try {
      const userId = req.user._id;
      const sessionId = ChatMessage.createSession();

      console.log('🆕 Chatbot: Creating new session:', { userId, sessionId });

      // Send welcome message
      const welcomeMessage = new ChatMessage({
        userId,
        sessionId,
        message: "Hello! I'm your Walmart shopping assistant. I can help you find products, check your orders, or answer any questions you have. How can I assist you today?",
        sender: 'bot',
        messageType: 'text',
        metadata: {
          intent: 'greeting',
          confidence: 1.0,
          entities: []
        }
      });

      await welcomeMessage.save();

      res.json({
        success: true,
        data: {
          sessionId,
          welcomeMessage: {
            id: welcomeMessage._id,
            message: welcomeMessage.message,
            sender: welcomeMessage.sender,
            messageType: welcomeMessage.messageType,
            timestamp: welcomeMessage.createdAt
          }
        }
      });

    } catch (error) {
      console.error('❌ Chatbot create session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create chat session',
        error: error.message
      });
    }
  }

  // Rate a bot response
  static async rateMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { rating, helpful } = req.body;
      const userId = req.user._id;

      console.log('⭐ Chatbot: Rating message:', { messageId, rating, helpful, userId });

      // Find the message
      const message = await ChatMessage.findOne({
        _id: messageId,
        userId,
        sender: 'bot'
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      // Update rating and helpful status
      if (rating !== undefined) {
        message.rating = rating;
      }
      if (helpful !== undefined) {
        message.helpful = helpful;
      }

      await message.save();

      res.json({
        success: true,
        data: {
          messageId,
          rating: message.rating,
          helpful: message.helpful
        }
      });

    } catch (error) {
      console.error('❌ Chatbot rate message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to rate message',
        error: error.message
      });
    }
  }

  // Get product recommendations
  static async getProductRecommendations(req, res) {
    try {
      const userId = req.user._id;
      const preferences = req.body.preferences || {};

      console.log('🛍️ Chatbot: Getting product recommendations:', { userId, preferences });

      const recommendations = await aiService.generateProductRecommendations(userId, preferences);

      res.json({
        success: true,
        data: recommendations
      });

    } catch (error) {
      console.error('❌ Chatbot recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get product recommendations',
        error: error.message
      });
    }
  }

  // Get chat analytics (for admin/debugging)
  static async getChatAnalytics(req, res) {
    try {
      const userId = req.user._id;
      const days = parseInt(req.query.days) || 30;

      console.log('📊 Chatbot: Getting chat analytics:', { userId, days });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analytics = await ChatMessage.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            userMessages: {
              $sum: { $cond: [{ $eq: ['$sender', 'user'] }, 1, 0] }
            },
            botMessages: {
              $sum: { $cond: [{ $eq: ['$sender', 'bot'] }, 1, 0] }
            },
            avgResponseTime: { $avg: '$responseTime' },
            helpfulResponses: {
              $sum: { $cond: [{ $eq: ['$helpful', true] }, 1, 0] }
            },
            unhelpfulResponses: {
              $sum: { $cond: [{ $eq: ['$helpful', false] }, 1, 0] }
            }
          }
        }
      ]);

      const result = analytics[0] || {
        totalMessages: 0,
        userMessages: 0,
        botMessages: 0,
        avgResponseTime: 0,
        helpfulResponses: 0,
        unhelpfulResponses: 0
      };

      res.json({
        success: true,
        data: {
          period: `${days} days`,
          analytics: result
        }
      });

    } catch (error) {
      console.error('❌ Chatbot analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get chat analytics',
        error: error.message
      });
    }
  }

  // Helper method to get user context
  static async getUserContext(userId) {
    try {
      const user = await User.findById(userId).select('firstName lastName email role');
      
      // Get recent orders with product details
      const recentOrders = await Order.find({ customerId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('items.productId', 'name price category brand')
        .select('orderNumber status totalAmount createdAt items');

      // Get recent chat history for context
      const recentChats = await ChatMessage.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('message sender messageType metadata');

      // Get user's purchase history for better recommendations
      const purchaseHistory = await Order.find({ customerId: userId, status: 'delivered' })
        .populate('items.productId', 'name category brand')
        .select('items createdAt')
        .limit(10);

      return {
        user,
        recentOrders,
        recentChats,
        purchaseHistory
      };

    } catch (error) {
      console.error('❌ Error getting user context:', error);
      return {};
    }
  }
}

module.exports = ChatbotController; 