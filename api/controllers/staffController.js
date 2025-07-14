const StaffProfile = require('../models/StaffProfile');
const Task = require('../models/Task');
const User = require('../models/User');
const { calculateAttendancePerformance } = require('../utils/attendanceGenerator');
const mongoose = require('mongoose');

// Get all staff for a store
const getAllStaff = async (req, res) => {
  try {
    // Handle both populated and non-populated storeId
    const storeId = req.user.storeId?._id || req.user.storeId || req.query.storeId;
    const { department, position, status, search, page = 1, limit = 10 } = req.query;

    // Build query - convert storeId to ObjectId if it's a string
    let query = { 
      storeId: typeof storeId === 'string' ? new mongoose.Types.ObjectId(storeId) : storeId 
    };
    
    if (department) query.department = department;
    if (position) query.position = position;
    if (status !== undefined) query.isActive = status === 'active';

    // Build aggregation pipeline for search
    let pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ];

    // Add search if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.firstName': { $regex: search, $options: 'i' } },
            { 'user.lastName': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { 'employeeId': { $regex: search, $options: 'i' } },
            { 'position': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    // Add computed fields
    pipeline.push({
      $addFields: {
        fullName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        yearsOfService: {
          $floor: {
            $divide: [
              { $subtract: [new Date(), '$hireDate'] },
              1000 * 60 * 60 * 24 * 365.25
            ]
          }
        }
      }
    });

    const staff = await StaffProfile.aggregate(pipeline);

    // Calculate performance and attendance for each staff member using the new system
    const staffWithPerformance = await Promise.all(
      staff.map(async (member) => {
        try {
          // Calculate performance based on attendance using the new system
          const performanceData = await calculateAttendancePerformance(member._id);
          
          // Update the member object with calculated values
          return {
            ...member,
            performance: {
              ...member.performance, // Keep existing performance data first
              rating: performanceData.rating, // Override with calculated rating
              attendanceBasedRating: performanceData.rating,
              lastUpdated: new Date(),
              attendanceBreakdown: performanceData.breakdown
            },
            attendanceRate: performanceData.attendanceRate,
            attendanceBreakdown: performanceData.breakdown
          };
        } catch (error) {
          console.error(`Error calculating performance for staff ${member._id}:`, error);
          // Return member with default values if calculation fails
          return {
            ...member,
            performance: {
              rating: 3.0,
              ...member.performance,
              lastUpdated: new Date()
            },
            attendanceRate: 0,
            attendanceBreakdown: null
          };
        }
      })
    );

    // Get total count for pagination
    const totalQuery = [...pipeline.slice(0, -3)]; // Remove sort, skip, limit
    totalQuery.push({ $count: 'total' });
    const totalResult = await StaffProfile.aggregate(totalQuery);
    const total = totalResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        staff: staffWithPerformance,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: staffWithPerformance.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving staff',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get staff by ID
const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;

    const staff = await StaffProfile.findOne({ _id: id, storeId })
      .populate('userId', 'firstName lastName email phone')
      .populate('managerId', 'firstName lastName');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Get recent tasks for this staff member
    const recentTasks = await Task.find({ assignedTo: id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('assignedBy', 'firstName lastName');

    res.json({
      success: true,
      data: {
        staff,
        recentTasks
      }
    });

  } catch (error) {
    console.error('Get staff by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving staff member',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Create new staff member
const createStaff = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const {
      userId,
      employeeId,
      position,
      department,
      hourlyRate,
      hireDate,
      managerId,
      emergencyContact,
      skills,
      certifications
    } = req.body;

    // Check if user exists and is not already a staff member
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const existingStaff = await StaffProfile.findOne({ userId });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: 'User is already a staff member'
      });
    }

    // Check if employee ID is unique
    const existingEmployeeId = await StaffProfile.findOne({ employeeId });
    if (existingEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }

    const newStaff = new StaffProfile({
      userId,
      storeId,
      employeeId,
      position,
      department,
      hourlyRate,
      hireDate: new Date(hireDate),
      managerId,
      emergencyContact,
      skills: skills || [],
      certifications: certifications || []
    });

    await newStaff.save();

    // Populate the created staff member
    const populatedStaff = await StaffProfile.findById(newStaff._id)
      .populate('userId', 'firstName lastName email phone')
      .populate('managerId', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: populatedStaff
    });

  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating staff member',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update staff member
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.userId;
    delete updateData.storeId;
    delete updateData.employeeId;

    const staff = await StaffProfile.findOneAndUpdate(
      { _id: id, storeId },
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'firstName lastName email phone')
     .populate('managerId', 'firstName lastName');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      message: 'Staff member updated successfully',
      data: staff
    });

  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating staff member',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete (deactivate) staff member
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;

    const staff = await StaffProfile.findOneAndUpdate(
      { _id: id, storeId },
      { 
        isActive: false,
        terminationDate: new Date(),
        terminationReason: req.body.reason || 'Terminated'
      },
      { new: true }
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      message: 'Staff member deactivated successfully',
      data: staff
    });

  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating staff member',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Record check-in
const recordCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;

    const staff = await StaffProfile.findOne({ _id: id, storeId });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    await staff.recordCheckIn();

    res.json({
      success: true,
      message: 'Check-in recorded successfully',
      data: {
        checkInTime: staff.attendance.lastCheckIn
      }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording check-in',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Record check-out
const recordCheckOut = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;

    const staff = await StaffProfile.findOne({ _id: id, storeId });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    await staff.recordCheckOut();

    res.json({
      success: true,
      message: 'Check-out recorded successfully',
      data: {
        checkOutTime: staff.attendance.lastCheckOut,
        totalHours: staff.attendance.totalHoursWorked
      }
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording check-out',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update performance review
const updatePerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;
    const performanceData = req.body;

    const staff = await StaffProfile.findOne({ _id: id, storeId });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    await staff.updatePerformance(performanceData);

    res.json({
      success: true,
      message: 'Performance updated successfully',
      data: staff.performance
    });

  } catch (error) {
    console.error('Update performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating performance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get staff performance analytics
const getStaffAnalytics = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { department, startDate, endDate } = req.query;

    // Build match conditions
    let matchConditions = { storeId, isActive: true };
    if (department) matchConditions.department = department;

    const analytics = await StaffProfile.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalStaff: { $sum: 1 },
          avgRating: { $avg: '$performance.rating' },
          avgHourlyRate: { $avg: '$hourlyRate' },
          totalHoursWorked: { $sum: '$attendance.totalHoursWorked' },
          avgAttendanceRate: {
            $avg: {
              $cond: {
                if: { $eq: [{ $add: ['$attendance.totalDaysWorked', '$attendance.absences'] }, 0] },
                then: 100,
                else: {
                  $multiply: [
                    { $divide: ['$attendance.totalDaysWorked', { $add: ['$attendance.totalDaysWorked', '$attendance.absences'] }] },
                    100
                  ]
                }
              }
            }
          }
        }
      }
    ]);

    // Get department breakdown
    const departmentBreakdown = await StaffProfile.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          avgRating: { $avg: '$performance.rating' },
          avgHourlyRate: { $avg: '$hourlyRate' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get position breakdown
    const positionBreakdown = await StaffProfile.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$position',
          count: { $sum: 1 },
          avgRating: { $avg: '$performance.rating' },
          avgHourlyRate: { $avg: '$hourlyRate' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get top performers
    const topPerformers = await StaffProfile.find(matchConditions)
      .populate('userId', 'firstName lastName')
      .sort({ 'performance.rating': -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        overview: analytics[0] || {
          totalStaff: 0,
          avgRating: 0,
          avgHourlyRate: 0,
          totalHoursWorked: 0,
          avgAttendanceRate: 0
        },
        departmentBreakdown,
        positionBreakdown,
        topPerformers
      }
    });

  } catch (error) {
    console.error('Get staff analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving staff analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get staff due for review
const getStaffDueForReview = async (req, res) => {
  try {
    const storeId = req.user.storeId;

    const staffDueForReview = await StaffProfile.findDueForReview(storeId);

    res.json({
      success: true,
      data: staffDueForReview
    });

  } catch (error) {
    console.error('Get staff due for review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving staff due for review',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
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
}; 