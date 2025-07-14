const express = require('express');
const router = express.Router();
const ProductAnalyticsController = require('../controllers/productAnalyticsController');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Get comprehensive product performance analysis
router.get('/performance/:storeId', ProductAnalyticsController.getProductPerformance);

// Get profitability insights
router.get('/profitability/:storeId', ProductAnalyticsController.getProfitabilityInsights);

// Apply product recommendation
router.post('/recommendations/:productId/apply', ProductAnalyticsController.applyProductRecommendation);

module.exports = router; 