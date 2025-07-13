const express = require('express');
const router = express.Router();
const managerOrderController = require('../controllers/managerOrderController');
const { verifyToken } = require('../middleware/auth');

// Get supplier products for manager's store
router.get('/products', verifyToken, managerOrderController.getSupplierProducts);

// Create new order from manager to supplier
router.post('/orders', verifyToken, managerOrderController.createOrder);

// Get manager's orders
router.get('/orders', verifyToken, managerOrderController.getManagerOrders);

// Get supplier's orders (for supplier dashboard)
router.get('/supplier/orders', verifyToken, managerOrderController.getSupplierOrders);

// Get order details (must come before /orders/:orderId/status)
router.get('/orders/:orderId', verifyToken, managerOrderController.getOrderDetails);

// Update order status (approve/reject by supplier)
router.patch('/orders/:orderId/status', verifyToken, managerOrderController.updateOrderStatus);

// Accept delivery (manager accepts received items)
router.post('/orders/:orderId/delivery', verifyToken, managerOrderController.acceptDelivery);

// Delete order (soft delete)
router.delete('/orders/:orderId', verifyToken, managerOrderController.deleteOrder);

module.exports = router; 