const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getDashboardStats,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  updateOrderStatus,
  updateDeliveryTime,
  getSupplierStores,
  getSupplierProducts
} = require('../controllers/supplierController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for supplier endpoints
const supplierLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

// Apply rate limiting to all routes
router.use(supplierLimiter);

// Middleware to verify supplier role
const verifySupplier = (req, res, next) => {
  if (req.user.role !== 'supplier') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Supplier role required.'
    });
  }
  next();
};

// Apply authentication and supplier verification to all routes
router.use(verifyToken);
router.use(verifySupplier);

// Dashboard Routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/stores', getSupplierStores);

// Product Management Routes
router.get('/products', getProducts);
router.post('/products', addProduct);
router.put('/products/:productId', updateProduct);
router.delete('/products/:productId', deleteProduct);

// Order Management Routes
router.get('/orders', getOrders);
router.put('/orders/:orderId/status', updateOrderStatus);
router.put('/orders/:orderId/delivery-time', updateDeliveryTime);

// Get supplier's products
router.get('/:supplierId/products', getSupplierProducts);

module.exports = router; 