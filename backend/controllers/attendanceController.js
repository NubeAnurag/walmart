const Attendance = require('../models/Attendance');
const StaffProfile = require('../models/StaffProfile');
const User = require('../models/User');
const { calculateAttendancePerformance, updateStaffPerformanceFromAttendance } = require('../utils/attendanceGenerator');
const mongoose = require('mongoose');

// Get staff attendance records for a specific date range
const getStaffAttendance = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { year, month, startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else if (year && month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      dateFilter = {
        date: {
          $gte: start,
          $lte: end
        }
      };
    }

    // Get attendance records
    const attendance = await Attendance.find({
      staffId,
      ...dateFilter
    })
      .populate('markedBy', 'firstName lastName')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: attendance
    });

  } catch (error) {
    console.error('Get staff attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Mark daily attendance for a staff member
const markDailyAttendance = async (req, res) => {
  try {
    const { staffId, date, status, checkInTime, checkOutTime, notes } = req.body;
    const managerId = req.user.id;

    // Validate inputs
    if (!staffId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID, date, and status are required'
      });
    }

    if (!['present', 'absent', 'halfday'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: present, absent, halfday'
      });
    }

    // Get staff profile to verify they belong to the manager's store
    const staffProfile = await StaffProfile.findById(staffId);
    if (!staffProfile) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Verify manager has access to this staff member
    const manager = await User.findById(managerId);
    if (!manager || !manager.storeId.equals(staffProfile.storeId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only mark attendance for staff in your store'
      });
    }

    // Parse the date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      staffId,
      date: {
        $gte: attendanceDate,
        $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    let attendance;
    if (existingAttendance) {
      // Update existing attendance
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        {
          status,
          checkInTime: checkInTime ? new Date(checkInTime) : null,
          checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
          notes,
          markedBy: managerId,
          markedAt: new Date()
        },
        { new: true }
      ).populate('markedBy', 'firstName lastName');
    } else {
      // Create new attendance record
      attendance = new Attendance({
        staffId,
        userId: staffProfile.userId,
        storeId: staffProfile.storeId,
        date: attendanceDate,
        status,
        checkInTime: checkInTime ? new Date(checkInTime) : null,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
        notes,
        markedBy: managerId
      });

      await attendance.save();
      attendance = await Attendance.findById(attendance._id).populate('markedBy', 'firstName lastName');
    }

    // Update staff performance based on new attendance
    try {
      await updateStaffPerformanceFromAttendance(staffId);
    } catch (error) {
      console.error('Error updating staff performance:', error);
      // Don't fail the request if performance update fails
    }

    res.json({
      success: true,
      message: `Attendance ${existingAttendance ? 'updated' : 'marked'} successfully`,
      data: attendance
    });

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get daily attendance for all staff in manager's store
const getDailyStoreAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const managerId = req.user.id;

    // Get manager's store
    const manager = await User.findById(managerId);
    if (!manager || !manager.storeId) {
      return res.status(400).json({
        success: false,
        message: 'Manager store not found'
      });
    }

    // Parse date or use today
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Get all staff in the store
    const storeStaff = await StaffProfile.find({
      storeId: manager.storeId,
      isActive: true
    }).populate('userId', 'firstName lastName email');

    // Get attendance records for the date
    const attendanceRecords = await Attendance.find({
      storeId: manager.storeId,
      date: {
        $gte: attendanceDate,
        $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('markedBy', 'firstName lastName');

    // Create attendance map for quick lookup
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.staffId.toString()] = record;
    });

    // Combine staff data with attendance
    const dailyAttendance = storeStaff.map(staff => {
      const attendanceRecord = attendanceMap[staff._id.toString()];
      
      return {
        staffId: staff._id,
        employeeId: staff.employeeId,
        name: `${staff.userId.firstName} ${staff.userId.lastName}`,
        email: staff.userId.email,
        position: staff.position,
        department: staff.department,
        attendance: attendanceRecord ? {
          status: attendanceRecord.status,
          checkInTime: attendanceRecord.checkInTime,
          checkOutTime: attendanceRecord.checkOutTime,
          notes: attendanceRecord.notes,
          markedBy: attendanceRecord.markedBy,
          markedAt: attendanceRecord.markedAt
        } : null
      };
    });

    // Calculate summary stats
    const summary = {
      totalStaff: storeStaff.length,
      present: attendanceRecords.filter(r => r.status === 'present').length,
      absent: attendanceRecords.filter(r => r.status === 'absent').length,
      halfday: attendanceRecords.filter(r => r.status === 'halfday').length,
      notMarked: storeStaff.length - attendanceRecords.length
    };

    res.json({
      success: true,
      data: {
        date: attendanceDate,
        attendance: dailyAttendance,
        summary
      }
    });

  } catch (error) {
    console.error('Get daily store attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving daily attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get attendance statistics for a staff member
const getStaffAttendanceStats = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { year, month } = req.query;

    // Default to current month if not specified
    const currentDate = new Date();
    const targetYear = parseInt(year) || currentDate.getFullYear();
    const targetMonth = parseInt(month) || currentDate.getMonth() + 1;

    // Calculate date range
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    // Get attendance records for the period
    const attendanceRecords = await Attendance.find({
      staffId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });

    // Calculate statistics
    const stats = {
      period: {
        year: targetYear,
        month: targetMonth,
        startDate,
        endDate
      },
      total: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.status === 'present').length,
      absent: attendanceRecords.filter(r => r.status === 'absent').length,
      halfday: attendanceRecords.filter(r => r.status === 'halfday').length,
      attendanceRate: 0,
      punctualityRate: 0
    };

    if (stats.total > 0) {
      stats.attendanceRate = ((stats.present + (stats.halfday * 0.5)) / stats.total) * 100;
      
      // Calculate punctuality (assuming 9:00 AM is the cutoff)
      const onTimeRecords = attendanceRecords.filter(record => {
        if (record.status === 'absent' || !record.checkInTime) return false;
        const checkInHour = record.checkInTime.getHours();
        const checkInMinute = record.checkInTime.getMinutes();
        return checkInHour < 9 || (checkInHour === 9 && checkInMinute <= 0);
      });
      
      stats.punctualityRate = ((onTimeRecords.length / (stats.total - stats.absent)) * 100) || 0;
    }

    // Round to 1 decimal place
    stats.attendanceRate = Math.round(stats.attendanceRate * 10) / 10;
    stats.punctualityRate = Math.round(stats.punctualityRate * 10) / 10;

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get staff attendance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get performance insights for a staff member
const getStaffPerformanceInsights = async (req, res) => {
  try {
    const { staffId } = req.params;
    const managerId = req.user.id;

    console.log('🎯 Getting performance insights for staff ID:', staffId);
    console.log('🎯 Request user:', managerId);

    // Verify staff exists and belongs to manager's store
    const staffProfile = await StaffProfile.findById(staffId);
    if (!staffProfile) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    console.log('✅ Staff profile found:', staffProfile._id);

    // Get manager's store
    const manager = await User.findById(managerId);
    if (!manager || !manager.storeId) {
      return res.status(400).json({
        success: false,
        message: 'Manager store not found'
      });
    }

    console.log('🏪 Manager store ID:', manager.storeId);
    console.log('🏪 Staff store ID:', staffProfile.storeId);

    // Verify access
    if (!manager.storeId.equals(staffProfile.storeId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view performance for staff in your store'
      });
    }

    // Calculate performance insights
    console.log('🎯 Getting performance insights...');
    const performanceData = await calculateAttendancePerformance(staffId);
    
    // Generate insights
    const insights = {
      rating: performanceData.rating,
      level: getPerformanceLevel(performanceData.rating),
      attendanceRate: performanceData.attendanceRate,
      breakdown: performanceData.breakdown,
      strengths: [],
      improvements: [],
      recommendations: []
    };

    // Add insights based on performance
    if (performanceData.attendanceRate >= 95) {
      insights.strengths.push('Excellent attendance record');
    } else if (performanceData.attendanceRate >= 85) {
      insights.strengths.push('Good attendance record');
    } else if (performanceData.attendanceRate < 70) {
      insights.improvements.push('Improve attendance rate');
    }

    if (performanceData.breakdown.punctualityRate >= 95) {
      insights.strengths.push('Consistently punctual');
    } else if (performanceData.breakdown.punctualityRate < 80) {
      insights.improvements.push('Improve punctuality');
    }

    if (performanceData.breakdown.consecutiveAbsences >= 3) {
      insights.improvements.push('Reduce consecutive absences');
    }

    console.log('✅ Performance insights generated:', insights);

    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    console.error('Get staff performance insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving performance insights',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Helper function to get performance level
const getPerformanceLevel = (rating) => {
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4.0) return 'Very Good';
  if (rating >= 3.5) return 'Good';
  if (rating >= 3.0) return 'Satisfactory';
  if (rating >= 2.5) return 'Needs Improvement';
  if (rating >= 2.0) return 'Below Average';
  return 'Poor';
};

// Bulk mark attendance for multiple staff
const bulkMarkAttendance = async (req, res) => {
  try {
    const { attendanceRecords, date } = req.body;
    const managerId = req.user.id;

    if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
      return res.status(400).json({
        success: false,
        message: 'Attendance records array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const record of attendanceRecords) {
      try {
        const { staffId, status, checkInTime, checkOutTime, notes } = record;
        
        // Mark attendance for this staff member
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const staffProfile = await StaffProfile.findById(staffId);
        if (!staffProfile) {
          errors.push({ staffId, error: 'Staff member not found' });
          continue;
        }

        // Check if attendance already exists
        const existingAttendance = await Attendance.findOne({
          staffId,
          date: {
            $gte: attendanceDate,
            $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
          }
        });

        let attendance;
        if (existingAttendance) {
          attendance = await Attendance.findByIdAndUpdate(
            existingAttendance._id,
            {
              status,
              checkInTime: checkInTime ? new Date(checkInTime) : null,
              checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
              notes,
              markedBy: managerId,
              markedAt: new Date()
            },
            { new: true }
          );
        } else {
          attendance = new Attendance({
            staffId,
            userId: staffProfile.userId,
            storeId: staffProfile.storeId,
            date: attendanceDate,
            status,
            checkInTime: checkInTime ? new Date(checkInTime) : null,
            checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
            notes,
            markedBy: managerId
          });
          await attendance.save();
        }

        results.push({
          staffId,
          employeeId: staffProfile.employeeId,
          status,
          success: true
        });

        // Update performance asynchronously
        updateStaffPerformanceFromAttendance(staffId).catch(err => {
          console.error('Error updating performance for staff', staffId, err);
        });

      } catch (error) {
        errors.push({ staffId: record.staffId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Marked attendance for ${results.length} staff members`,
      data: {
        successful: results,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking bulk attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Helper function to generate calendar with attendance data
const generateCalendar = (year, month, attendanceData, hireDate) => {
  const calendar = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const hireDateObj = new Date(hireDate);
  
  // Create a map of attendance data by date
  const attendanceMap = new Map();
  attendanceData.forEach(record => {
    const dateKey = record.date.toISOString().split('T')[0];
    attendanceMap.set(dateKey, record);
  });
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateKey = date.toISOString().split('T')[0];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isBeforeHireDate = date < hireDateObj;
    
    calendar.push({
      date: dateKey,
      day,
      isWeekend,
      isBeforeHireDate,
      attendance: attendanceMap.get(dateKey) || null
    });
  }
  
  return calendar;
};

// Get my attendance data (for staff members)
const getMyAttendance = async (req, res) => {
  try {
    console.log('=== 📅 getMyAttendance Debug ===');
    console.log('📅 Request headers:', { 
      authorization: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'None',
      'content-type': req.headers['content-type']
    });
    console.log('📅 Request user:', {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      staffType: req.user?.staffType,
      firstName: req.user?.firstName,
      lastName: req.user?.lastName
    });
    console.log('📅 Request query params:', req.query);
    
    const userId = req.user.id;
    const { year, month } = req.query;
    
    // Find staff profile
    console.log('📅 Finding staff profile for user ID:', userId);
    const staffProfile = await StaffProfile.findOne({ userId });
    if (!staffProfile) {
      console.log('❌ Staff profile not found for user ID:', userId);
      return res.status(404).json({
        success: false,
        message: 'Staff profile not found'
      });
    }
    
    console.log('✅ Staff profile found:', {
      id: staffProfile._id,
      employeeId: staffProfile.employeeId,
      userId: staffProfile.userId,
      userName: staffProfile.userName
    });
    
    // Parse date parameters
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    
    console.log('📅 Date parameters:', { year: targetYear, month: targetMonth });
    
    // Calculate date range for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);
    
    console.log('📅 Date range:', { start: startDate, end: endDate });
    
    // Get attendance data
    console.log('📅 Querying attendance data for staff ID:', staffProfile._id);
    const attendanceData = await Attendance.find({
      staffId: staffProfile._id,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });
    
    console.log('📅 Attendance data found:', attendanceData.length, 'records');
    
    // Generate calendar with attendance data
    const calendar = generateCalendar(targetYear, targetMonth, attendanceData, staffProfile.hireDate);
    
    // Calculate summary statistics
    const totalWorkingDays = calendar.filter(day => !day.isWeekend && !day.isBeforeHireDate).length;
    const presentDays = calendar.filter(day => day.attendance?.status === 'present').length;
    const absentDays = calendar.filter(day => day.attendance?.status === 'absent').length;
    const halfDays = calendar.filter(day => day.attendance?.status === 'halfday').length;
    const unmarkedDays = totalWorkingDays - presentDays - absentDays - halfDays;
    const attendanceRate = totalWorkingDays > 0 ? ((presentDays + halfDays * 0.5) / totalWorkingDays * 100).toFixed(1) : 0;
    
    const summary = {
      totalWorkingDays,
      presentDays,
      absentDays,
      halfDays,
      unmarkedDays,
      attendanceRate: parseFloat(attendanceRate)
    };
    
    console.log('📅 Summary calculated:', summary);
    
    const responseData = {
      staff: {
        employeeId: staffProfile.employeeId,
        userName: staffProfile.userName,
        position: staffProfile.position,
        department: staffProfile.department,
        hireDate: staffProfile.hireDate
      },
      calendar,
      summary
    };
    
    console.log('📅 Sending response with calendar length:', calendar.length);
    
    res.json({
      success: true,
      data: responseData
    });
    
    console.log('✅ getMyAttendance completed successfully');
  } catch (error) {
    console.error('❌ getMyAttendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get my performance insights (for staff members)
const getMyPerformanceInsights = async (req, res) => {
  try {
    console.log('=== 📊 getMyPerformanceInsights Debug ===');
    console.log('📊 Request headers:', { 
      authorization: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'None',
      'content-type': req.headers['content-type']
    });
    console.log('📊 Request user:', {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      staffType: req.user?.staffType,
      firstName: req.user?.firstName,
      lastName: req.user?.lastName
    });
    
    const userId = req.user.id;
    
    // Find staff profile
    console.log('📊 Finding staff profile for user ID:', userId);
    const staffProfile = await StaffProfile.findOne({ userId });
    if (!staffProfile) {
      console.log('❌ Staff profile not found for user ID:', userId);
      return res.status(404).json({
        success: false,
        message: 'Staff profile not found'
      });
    }
    
    console.log('✅ Staff profile found:', {
      id: staffProfile._id,
      employeeId: staffProfile.employeeId,
      userId: staffProfile.userId,
      userName: staffProfile.userName
    });
    
    // Calculate performance metrics
    console.log('📊 Calculating performance metrics...');
    const performanceInsights = await calculateAttendancePerformance(staffProfile._id);
    
    console.log('📊 Performance metrics calculated:', performanceInsights);
    
    res.json({
      success: true,
      data: performanceInsights
    });
    
    console.log('✅ getMyPerformanceInsights completed successfully');
  } catch (error) {
    console.error('❌ getMyPerformanceInsights error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getStaffAttendance,
  markDailyAttendance,
  getDailyStoreAttendance,
  getStaffAttendanceStats,
  getStaffPerformanceInsights,
  bulkMarkAttendance,
  getMyAttendance,
  getMyPerformanceInsights
}; 