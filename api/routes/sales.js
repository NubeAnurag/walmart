const express = require('express');
const {
  createSale,
  getStoreSales,
  getSaleById,
  getSalesAnalytics,
  downloadReceipt
} = require('../controllers/salesController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Sales routes
router.post('/', createSale);
router.get('/store/:storeId', getStoreSales);
router.get('/store/:storeId/analytics', getSalesAnalytics);
router.get('/:id', getSaleById);
router.get('/:id/receipt', downloadReceipt);

module.exports = router; 