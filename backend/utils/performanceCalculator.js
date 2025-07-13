const Attendance = require('../models/Attendance');
const StaffProfile = require('../models/StaffProfile');
const { calculateAttendancePerformance } = require('./attendanceGenerator');

/**
 * Calculate performance rating based on attendance patterns (wrapper for new system)
 * @param {String} staffId - Staff member ID
 * @param {Number} months - Number of months to evaluate (default: 3)
 * @returns {Object} Performance data including rating and breakdown
 */
const calculateAttendancePerformance_Legacy = async (staffId, months = 3) => {
  try {
    // Calculate date range for evaluation period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Use the new attendance performance calculator
    const performanceData = await calculateAttendancePerformance(staffId, startDate, endDate);

    return {
      rating: performanceData.rating,
      breakdown: {
        totalDays: performanceData.breakdown.totalDays,
        presentDays: performanceData.breakdown.present,
        absentDays: performanceData.breakdown.absent,
        halfDays: performanceData.breakdown.halfday,
        attendanceRate: performanceData.breakdown.attendanceRate,
        punctualityScore: performanceData.rating,
        consistencyScore: performanceData.rating,
        overallScore: performanceData.rating
      },
      period: {
        startDate,
        endDate,
        months
      }
    };

  } catch (error) {
    console.error('Error calculating attendance performance:', error);
    throw error;
  }
};

/**
 * Calculate consistency score based on attendance patterns
 * @param {Array} attendanceRecords - Array of attendance records
 * @returns {Number} Consistency score (1-5)
 */
const calculateConsistencyScore = (attendanceRecords) => {
  if (attendanceRecords.length === 0) return 3.0;

  // For small datasets, use a simpler approach
  if (attendanceRecords.length < 7) {
    // Calculate based on overall attendance pattern
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
    const halfDays = attendanceRecords.filter(r => r.status === 'halfday').length;
    const attendanceRate = ((presentDays + (halfDays * 0.5)) / totalDays) * 100;
    
    // Make consistency score more proportional to attendance rate
    if (attendanceRate >= 90) return 4.5;
    if (attendanceRate >= 80) return 4.0;
    if (attendanceRate >= 70) return 3.5;
    if (attendanceRate >= 60) return 3.0;
    if (attendanceRate >= 50) return 2.5;
    if (attendanceRate >= 40) return 2.0;
    if (attendanceRate >= 30) return 1.5;
    if (attendanceRate >= 20) return 1.0;
    return 0.5;
  }

  // Group records by week to analyze patterns for larger datasets
  const weeklyData = {};
  attendanceRecords.forEach(record => {
    const weekKey = getWeekKey(record.date);
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { present: 0, absent: 0, halfday: 0 };
    }
    weeklyData[weekKey][record.status]++;
  });

  const weeks = Object.keys(weeklyData);
  if (weeks.length === 0) return 3.0;

  // Calculate consistency metrics with lower threshold
  let consistentWeeks = 0;
  let totalWeeks = weeks.length;

  weeks.forEach(week => {
    const weekData = weeklyData[week];
    const weekTotal = weekData.present + weekData.absent + weekData.halfday;
    const weekAttendanceRate = ((weekData.present + (weekData.halfday * 0.5)) / weekTotal) * 100;
    
    // Lower the threshold for "consistent" weeks to 50%
    if (weekAttendanceRate >= 50) {
      consistentWeeks++;
    }
  });

  const consistencyRate = (consistentWeeks / totalWeeks) * 100;

  // Convert consistency rate to score with more generous scaling
  if (consistencyRate >= 90) return 5.0;
  if (consistencyRate >= 80) return 4.5;
  if (consistencyRate >= 70) return 4.0;
  if (consistencyRate >= 60) return 3.5;
  if (consistencyRate >= 50) return 3.0;
  if (consistencyRate >= 40) return 2.5;
  if (consistencyRate >= 30) return 2.0;
  if (consistencyRate >= 20) return 1.5;
  return 1.0;
};

/**
 * Get week key for grouping attendance records
 * @param {Date} date - Date to get week key for
 * @returns {String} Week key in format "YYYY-WW"
 */
const getWeekKey = (date) => {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-${week.toString().padStart(2, '0')}`;
};

/**
 * Get week number of the year
 * @param {Date} date - Date to get week number for
 * @returns {Number} Week number (1-53)
 */
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

/**
 * Update staff performance rating based on attendance
 * @param {String} staffId - Staff member ID
 * @returns {Object} Updated performance data
 */
const updateStaffPerformanceRating = async (staffId) => {
  try {
    // Calculate new performance rating using the new system
    const performanceData = await calculateAttendancePerformance(staffId);
    
    // Update staff profile with new performance rating
    const staffProfile = await StaffProfile.findById(staffId);
    if (!staffProfile) {
      throw new Error('Staff profile not found');
    }

    // Update performance object
    const updatedPerformance = {
      rating: performanceData.rating,
      lastUpdated: new Date(),
      attendanceBasedRating: performanceData.rating,
      attendanceBreakdown: performanceData.breakdown,
      evaluationPeriod: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date()
      },
      lastReview: staffProfile.performance?.lastReview || new Date(),
      nextReview: staffProfile.performance?.nextReview || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      goals: staffProfile.performance?.goals || [],
      notes: staffProfile.performance?.notes || ''
    };

    // Update staff profile
    await StaffProfile.findByIdAndUpdate(
      staffId,
      {
        $set: {
          performance: updatedPerformance,
          attendanceRate: performanceData.breakdown.attendanceRate
        }
      },
      { new: true }
    );

    return {
      success: true,
      performanceData,
      updatedRating: performanceData.rating
    };

  } catch (error) {
    console.error('Error updating staff performance rating:', error);
    throw error;
  }
};

/**
 * Get performance insights for staff member
 * @param {String} staffId - Staff member ID
 * @returns {Object} Performance insights
 */
const getPerformanceInsights = async (staffId) => {
  try {
    const performanceData = await calculateAttendancePerformance(staffId);
    
    const insights = {
      rating: performanceData.rating,
      level: getPerformanceLevel(performanceData.rating),
      strengths: [],
      improvements: [],
      recommendations: []
    };

    // Add insights based on attendance patterns
    if (performanceData.breakdown.attendanceRate >= 95) {
      insights.strengths.push('Excellent attendance record');
    } else if (performanceData.breakdown.attendanceRate >= 85) {
      insights.strengths.push('Good attendance record');
    } else if (performanceData.breakdown.attendanceRate < 70) {
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

    // Add recommendations based on performance
    if (performanceData.rating < 3.0) {
      insights.recommendations.push('Consider additional training and support');
      insights.recommendations.push('Schedule regular check-ins with supervisor');
    } else if (performanceData.rating >= 4.5) {
      insights.recommendations.push('Consider for leadership opportunities');
      insights.recommendations.push('Eligible for performance bonus');
    }

    return insights;

  } catch (error) {
    console.error('Error getting performance insights:', error);
    throw error;
  }
};

/**
 * Get performance level description
 * @param {Number} rating - Performance rating
 * @returns {String} Performance level
 */
const getPerformanceLevel = (rating) => {
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4.0) return 'Very Good';
  if (rating >= 3.5) return 'Good';
  if (rating >= 3.0) return 'Satisfactory';
  if (rating >= 2.5) return 'Needs Improvement';
  if (rating >= 2.0) return 'Below Average';
  return 'Poor';
};

module.exports = {
  calculateAttendancePerformance,
  updateStaffPerformanceRating,
  getPerformanceInsights,
  getPerformanceLevel
}; 