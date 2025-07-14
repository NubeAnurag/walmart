const express = require('express');
const router = express.Router();
const AIOptimizationController = require('../controllers/aiOptimizationController');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Get AI insights for a store
router.get('/insights/:storeId', AIOptimizationController.getAIInsights);

// Run real-time AI analysis
router.post('/analyze/:storeId', AIOptimizationController.runAIAnalysis);

// Apply AI recommendation
router.post('/recommendations/:recommendationId/apply', AIOptimizationController.applyRecommendation);

// Get AI model performance
router.get('/performance/:storeId', AIOptimizationController.getAIModelPerformance);

module.exports = router; 