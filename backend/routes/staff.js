const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  recordCheckIn,
  recordCheckOut,
  updatePerformance,
  getStaffAnalytics,
  getStaffDueForReview
} = require('../controllers/staffController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for staff endpoints
const staffLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many staff requests, please try again later.'
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
router.use(staffLimiter);
router.use(verifyToken);
router.use(requireManager);

// Staff CRUD routes
router.get('/', getAllStaff);
router.get('/analytics', getStaffAnalytics);
router.get('/due-for-review', getStaffDueForReview);
router.get('/:id', getStaffById);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

// Attendance routes
router.post('/:id/check-in', recordCheckIn);
router.post('/:id/check-out', recordCheckOut);

// Performance routes
router.put('/:id/performance', updatePerformance);

module.exports = router; 