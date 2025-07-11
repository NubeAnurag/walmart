const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  approveSupplier,
  deactivateSupplier,
  getAllPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderById,
  approvePurchaseOrder,
  receiveItems,
  getSupplierAnalytics,
  getSuppliersByStore,
  getSupplierProducts,
  debugStoreData
} = require('../controllers/supplierController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for supplier endpoints
const supplierLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many supplier requests, please try again later.'
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

// Apply rate limiting and authentication to all other routes
router.use(supplierLimiter);
router.use(verifyToken);
router.use(requireManager);

// Supplier routes
router.get('/', getAllSuppliers);
router.get('/analytics', getSupplierAnalytics);
router.get('/by-store', getSuppliersByStore);
router.get('/debug/store-data', debugStoreData);
router.get('/:id', getSupplierById);
router.get('/:id/products', getSupplierProducts);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.post('/:id/approve', approveSupplier);
router.delete('/:id', deactivateSupplier);

// Purchase order routes
router.get('/orders/all', getAllPurchaseOrders);
router.post('/orders', createPurchaseOrder);
router.get('/orders/:id', getPurchaseOrderById);
router.post('/orders/:id/approve', approvePurchaseOrder);
router.post('/orders/:id/receive', receiveItems);

module.exports = router; 