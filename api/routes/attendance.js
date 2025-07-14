const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getStaffAttendance,
  markDailyAttendance,
  getDailyStoreAttendance,
  getStaffAttendanceStats,
  getStaffPerformanceInsights,
  bulkMarkAttendance,
  getMyAttendance,
  getMyPerformanceInsights
} = require('../controllers/attendanceController');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get attendance for a specific staff member for a date range
router.get('/staff/:staffId', requireRole(['manager']), getStaffAttendance);

// Mark daily attendance for a staff member
router.post('/mark', requireRole(['manager']), markDailyAttendance);

// Bulk mark attendance for multiple staff members
router.post('/bulk-mark', requireRole(['manager']), bulkMarkAttendance);

// Get daily attendance for all staff in store
router.get('/store/daily', requireRole(['manager']), getDailyStoreAttendance);

// Get attendance statistics for a staff member
router.get('/staff/:staffId/stats', requireRole(['manager']), getStaffAttendanceStats);

// Get performance insights for a staff member
router.get('/staff/:staffId/insights', requireRole(['manager']), getStaffPerformanceInsights);

// Get my attendance data (for staff members)
router.get('/my-attendance', requireRole(['staff']), getMyAttendance);

// Get my performance insights (for staff members)
router.get('/my-performance', requireRole(['staff']), getMyPerformanceInsights);

// Debug route to check current user
router.get('/debug/whoami', (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user?.id,
      role: req.user?.role,
      staffType: req.user?.staffType,
      firstName: req.user?.firstName,
      lastName: req.user?.lastName,
      email: req.user?.email
    }
  });
});

module.exports = router; 