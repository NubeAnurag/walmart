const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  createEmployee,
  getEmployees,
  getEmployeesByStore,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  resetEmployeePassword,
  getDashboardStats,
  getAllSuppliers,
  approveSupplier,
  updateSupplierStatus
} = require('../controllers/adminController');

// Apply admin authentication to all routes
router.use(adminAuth);

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Employee management routes
router.post('/employees', createEmployee);
router.get('/employees', getEmployees);
router.get('/employees/by-store', getEmployeesByStore);
router.get('/employees/:id', getEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);
router.post('/employees/:id/reset-password', resetEmployeePassword);

// Supplier management routes
router.get('/suppliers', getAllSuppliers);
router.put('/suppliers/:supplierId/approve', approveSupplier);
router.put('/suppliers/:supplierId/status', updateSupplierStatus);

module.exports = router; 