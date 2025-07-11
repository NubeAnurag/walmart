const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getAllReports,
  getReportById,
  generateSalesReport,
  generateInventoryReport,
  generateStaffReport,
  downloadReport,
  deleteReport,
  getReportTemplates
} = require('../controllers/reportsController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for reports endpoints
const reportsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs (reports are resource intensive)
  message: {
    success: false,
    message: 'Too many report requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Special rate limiting for report generation (more restrictive)
const reportGenerationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 report generations per 5 minutes
  message: {
    success: false,
    message: 'Report generation limit exceeded. Please wait before generating more reports.'
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
router.use(reportsLimiter);
router.use(verifyToken);
router.use(requireManager);

// Report management routes
router.get('/', getAllReports);
router.get('/templates', getReportTemplates);
router.get('/:id', getReportById);
router.get('/:id/download', downloadReport);
router.delete('/:id', deleteReport);

// Report generation routes (with stricter rate limiting)
router.post('/generate/sales', reportGenerationLimiter, generateSalesReport);
router.post('/generate/inventory', reportGenerationLimiter, generateInventoryReport);
router.post('/generate/staff', reportGenerationLimiter, generateStaffReport);

module.exports = router; 