const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getCustomerAnalytics,
  getCustomerSegmentation,
  getCustomerBehavior
} = require('../controllers/customerInsightsController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for customer insights endpoints
const customerInsightsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many customer insights requests, please try again later.'
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
router.use(customerInsightsLimiter);
router.use(verifyToken);
router.use(requireManager);

// Customer insights routes
router.get('/analytics', getCustomerAnalytics);
router.get('/segmentation', getCustomerSegmentation);
router.get('/behavior', getCustomerBehavior);

module.exports = router; 