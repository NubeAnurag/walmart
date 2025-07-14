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
        console.log('🆕 Chatbot: Creating new session:', { userId, sessionId: currentSessionId });
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

      console.log('🔍 AI Response metadata:', JSON.stringify(aiResponse.metadata, null, 2));

      // Temporarily disable entities completely to avoid validation issues
      // TODO: Fix entity handling in a future update
      const cleanEntities = [];

      console.log('🔍 Final clean entities:', cleanEntities);
      console.log('🔍 Clean entities type:', typeof cleanEntities);
      console.log('🔍 Clean entities is array:', Array.isArray(cleanEntities));

      // Create clean metadata object
      const cleanMetadata = {
        intent: aiResponse.metadata.intent || 'unknown',
        confidence: Number(aiResponse.metadata.confidence) || 0,
        entities: cleanEntities, // Use the cleaned entities array
        responseTime: Number(aiResponse.metadata.responseTime) || 0
      };

      // Add optional fields if they exist
      if (aiResponse.metadata.products && Array.isArray(aiResponse.metadata.products)) {
        cleanMetadata.products = aiResponse.metadata.products;
      }
      if (aiResponse.metadata.orderId) {
        cleanMetadata.orderId = aiResponse.metadata.orderId;
      }
      if (aiResponse.metadata.stores && Array.isArray(aiResponse.metadata.stores)) {
        cleanMetadata.stores = aiResponse.metadata.stores;
      }

      console.log('💾 Final metadata before saving:', JSON.stringify(cleanMetadata, null, 2));
      
      // Validate that entities is still an array before saving
      if (!Array.isArray(cleanMetadata.entities)) {
        console.error('❌ Entities is not an array before saving! Type:', typeof cleanMetadata.entities);
        cleanMetadata.entities = []; // Force it to be an empty array
      }

      // Save bot response
      const botMessage = new ChatMessage({
        userId,
        sessionId: currentSessionId,
        message: aiResponse.message,
        sender: 'bot',
        messageType: aiResponse.messageType || 'text',
        metadata: cleanMetadata,
        responseTime: cleanMetadata.responseTime
      });

      console.log('💾 ChatMessage object before save:', {
        messageType: botMessage.messageType,
        metadataEntities: botMessage.metadata.entities,
        entitiesType: typeof botMessage.metadata.entities,
        entitiesIsArray: Array.isArray(botMessage.metadata.entities)
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
      console.warn('❌ Chatbot send message error:', error);
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

      // Get user context for personalized welcome message
      const userContext = await ChatbotController.getUserContext(userId);
      const userName = userContext.user ? userContext.user.firstName : 'there';

      // Send welcome message
      const welcomeMessage = new ChatMessage({
        userId,
        sessionId,
        message: `Hello ${userName}! I'm your Walmart shopping assistant. I can help you find products, check your orders, or answer any questions you have. How can I assist you today?`,
        sender: 'bot',
        messageType: 'greeting',
        metadata: {
          intent: 'greeting',
          confidence: 1.0,
          entities: [],
          responseTime: 0
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

  // Rate a bot message (helpful/not helpful)
  static async rateMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { helpful, rating } = req.body;
      const userId = req.user._id;

      console.log('⭐ Chatbot: Rating message:', { messageId, helpful, rating, userId });

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

      // Update rating fields
      if (typeof helpful === 'boolean') {
        message.helpful = helpful;
      }
      
      if (rating && rating >= 1 && rating <= 5) {
        message.rating = rating;
      }

      await message.save();

      res.json({
        success: true,
        data: {
          messageId: message._id,
          helpful: message.helpful,
          rating: message.rating
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

  // Get chat analytics
  static async getChatAnalytics(req, res) {
    try {
      const userId = req.user._id;
      const days = parseInt(req.query.days) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      console.log('📊 Chatbot: Getting analytics:', { userId, days });

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
            helpfulMessages: {
              $sum: { $cond: [{ $eq: ['$helpful', true] }, 1, 0] }
            },
            sessions: { $addToSet: '$sessionId' }
          }
        }
      ]);

      const result = analytics[0] || {
        totalMessages: 0,
        userMessages: 0,
        botMessages: 0,
        avgResponseTime: 0,
        helpfulMessages: 0,
        sessions: []
      };

      res.json({
        success: true,
        data: {
          period: `${days} days`,
          totalMessages: result.totalMessages,
          userMessages: result.userMessages,
          botMessages: result.botMessages,
          totalSessions: result.sessions.length,
          avgResponseTime: Math.round(result.avgResponseTime || 0),
          helpfulnessRate: result.botMessages > 0 ? 
            ((result.helpfulMessages / result.botMessages) * 100).toFixed(1) : '0.0'
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

  // Helper method to add products to cart
  static async addToCart(req, res) {
    try {
      const { productId, quantity = 1 } = req.body;
      const userId = req.user._id;

      console.log('🛒 Chatbot: Adding to cart:', { productId, quantity, userId });

      // Validate product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Here you would typically integrate with your cart system
      // For now, we'll just return a success message
      res.json({
        success: true,
        message: `Added ${quantity} x ${product.name} to your cart`,
        data: {
          productId: product._id,
          productName: product.name,
          quantity,
          price: product.price,
          totalPrice: product.price * quantity
        }
      });

    } catch (error) {
      console.error('❌ Add to cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add product to cart',
        error: error.message
      });
    }
  }
}

module.exports = ChatbotController; 