const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getDashboardOverview,
  getSalesAnalytics,
  getInventoryAnalytics,
  getPerformanceMetrics,
  getRealTimeAlerts,
  getSupplierPerformanceMetrics
} = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many analytics requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to ensure user is manager
const requireManager = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Manager role required.'
    });
  }
  next();
};

// Apply rate limiting and authentication to all routes
router.use(analyticsLimiter);
router.use(verifyToken);
router.use(requireManager);

// Analytics routes
router.get('/dashboard', getDashboardOverview);
router.get('/sales', getSalesAnalytics);
router.get('/inventory', getInventoryAnalytics);
router.get('/performance', getPerformanceMetrics);
router.get('/alerts', getRealTimeAlerts);
router.get('/supplier-performance', getSupplierPerformanceMetrics);

module.exports = router; 