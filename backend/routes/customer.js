const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getStores,
  getStoreProducts,
  getProductDetails,
  createOrder,
  getCustomerOrders,
  downloadReceipt
} = require('../controllers/customerController');
const { getStoreInventory } = require('../controllers/inventoryController');

// Middleware to ensure only customers can access these routes
const customerAuth = (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Customer role required.'
    });
  }
  next();
};

// Apply authentication to all routes
router.use(verifyToken);
router.use(customerAuth);

// Store routes
router.get('/stores', getStores);
router.get('/stores/:storeId/products', getStoreProducts);

// Product routes
router.get('/products/:productId', getProductDetails);

// Order routes
router.post('/orders', createOrder);
router.get('/orders', getCustomerOrders);

// Receipt routes
router.get('/receipt/:saleId', downloadReceipt);

// Add inventory route for customers
router.get('/inventory/:storeId', getStoreInventory);

module.exports = router; 