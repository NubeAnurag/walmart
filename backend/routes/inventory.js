const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getStockAlerts,
  getInventoryAnalytics,
  updateReorderSettings
} = require('../controllers/inventoryController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for inventory endpoints
const inventoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many inventory requests, please try again later.'
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
router.use(inventoryLimiter);
router.use(verifyToken);
router.use(requireManager);

// Product routes
router.get('/products', getAllProducts);
router.get('/products/:id', getProductById);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Stock management routes
router.post('/products/:id/stock', updateStock);
router.put('/products/:id/reorder-settings', updateReorderSettings);

// Analytics and alerts routes
router.get('/alerts', getStockAlerts);
router.get('/analytics', getInventoryAnalytics);

module.exports = router; 