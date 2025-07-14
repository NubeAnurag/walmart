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
  updateReorderSettings,
  getStoreInventory,
  testInventoryDirect,
  debugCheckOrders,
  debugFixOrders
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

// Test routes (no auth) - must be before auth middleware
router.get('/test-direct', testInventoryDirect);

// Temporary test route for getAllProducts without auth (for debugging)
router.get('/test-all-products', async (req, res) => {
  try {
    // Mock user object for testing
    req.user = {
      id: '687164e2a0f1eabadaf16341',
      storeId: '6871614bc7c1418205200192',
      role: 'manager'
    };
    
    console.log('🧪 Testing getAllProducts without auth');
    await getAllProducts(req, res);
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
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

// Apply rate limiting and authentication to all routes except test routes
router.use('/products', inventoryLimiter);
router.use('/products', verifyToken);
router.use('/products', requireManager);

router.use('/alerts', inventoryLimiter);
router.use('/alerts', verifyToken);
router.use('/alerts', requireManager);

router.use('/analytics', inventoryLimiter);
router.use('/analytics', verifyToken);
router.use('/analytics', requireManager);

router.use('/debug', inventoryLimiter);
router.use('/debug', verifyToken);
router.use('/debug', requireManager);

// Product routes
router.get('/products', (req, res, next) => {
  console.log('🔍 Inventory products route called');
  console.log('👤 User:', req.user?.name, req.user?.role);
  next();
}, getAllProducts);
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

// Staff dashboard routes
router.get('/store/:storeId', getStoreInventory);

// Debug routes (temporary)
router.get('/debug/check-orders', debugCheckOrders);
router.post('/debug/fix-orders', debugFixOrders);

module.exports = router; 