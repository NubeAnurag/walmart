const express = require('express');
const router = express.Router();
const ChatbotController = require('../controllers/chatbotController');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Send a message to the chatbot
router.post('/message', ChatbotController.sendMessage);

// Get chat history for a specific session
router.get('/history/:sessionId', ChatbotController.getChatHistory);

// Get all chat sessions for the user
router.get('/sessions', ChatbotController.getChatSessions);

// Create a new chat session
router.post('/session', ChatbotController.createSession);

// Rate a bot message
router.post('/rate/:messageId', ChatbotController.rateMessage);

// Get product recommendations
router.post('/recommendations', ChatbotController.getProductRecommendations);

// Get chat analytics
router.get('/analytics', ChatbotController.getChatAnalytics);

module.exports = router; 