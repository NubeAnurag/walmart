const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const StaffProfile = require('../models/StaffProfile');

/**
 * Generate attendance records for staff members from their hire date to current date
 * @param {ObjectId} staffId - The staff member's ID
 * @param {ObjectId} managerId - The manager's ID (who marks attendance)
 * @param {Date} startDate - Start date (hire date)
 * @param {Date} endDate - End date (current date)
 */
const generateAttendanceRecords = async (staffId, managerId, startDate, endDate = new Date()) => {
  try {
    const staffProfile = await StaffProfile.findById(staffId);
    if (!staffProfile) {
      throw new Error('Staff profile not found');
    }

    const attendanceRecords = [];
    const currentDate = new Date(startDate);
    
    // Generate attendance for each day from hire date to current date
    while (currentDate <= endDate) {
      // Skip weekends (assuming 5-day work week)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        
        // Check if attendance record already exists
        const existingRecord = await Attendance.findOne({
          staffId: staffId,
          date: {
            $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
            $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
          }
        });

        if (!existingRecord) {
          // Generate realistic attendance pattern
          const attendanceStatus = generateRealisticAttendanceStatus(currentDate);
          
          const attendanceRecord = {
            staffId: staffId,
            userId: staffProfile.userId,
            storeId: staffProfile.storeId,
            date: new Date(currentDate),
            status: attendanceStatus,
            checkInTime: attendanceStatus !== 'absent' ? generateCheckInTime(currentDate) : null,
            checkOutTime: attendanceStatus !== 'absent' ? generateCheckOutTime(currentDate, attendanceStatus) : null,
            notes: generateAttendanceNotes(attendanceStatus),
            markedBy: managerId,
            markedAt: new Date(currentDate.getTime() + Math.random() * 8 * 60 * 60 * 1000) // Random time during the day
          };

          attendanceRecords.push(attendanceRecord);
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Bulk insert attendance records
    if (attendanceRecords.length > 0) {
      await Attendance.insertMany(attendanceRecords);
      console.log(`✅ Generated ${attendanceRecords.length} attendance records for staff ${staffId}`);
    }

    return attendanceRecords;
  } catch (error) {
    console.error('Error generating attendance records:', error);
    throw error;
  }
};

/**
 * Generate realistic attendance status based on probabilities
 * @param {Date} date - The date for attendance
 * @returns {string} - 'present', 'absent', or 'halfday'
 */
const generateRealisticAttendanceStatus = (date) => {
  const random = Math.random();
  
  // Realistic probabilities:
  // 85% present, 10% absent, 5% halfday
  if (random < 0.85) return 'present';
  if (random < 0.95) return 'absent';
  return 'halfday';
};

/**
 * Generate check-in time (between 8:00 AM and 9:30 AM)
 * @param {Date} date - The date
 * @returns {Date} - Check-in time
 */
const generateCheckInTime = (date) => {
  const checkInDate = new Date(date);
  const hour = 8 + Math.floor(Math.random() * 1.5); // 8:00 to 9:30 AM
  const minute = Math.floor(Math.random() * 60);
  checkInDate.setHours(hour, minute, 0, 0);
  return checkInDate;
};

/**
 * Generate check-out time based on attendance status
 * @param {Date} date - The date
 * @param {string} status - Attendance status
 * @returns {Date} - Check-out time
 */
const generateCheckOutTime = (date, status) => {
  const checkOutDate = new Date(date);
  
  if (status === 'halfday') {
    // Half day: 1:00 PM to 2:00 PM
    const hour = 13 + Math.floor(Math.random() * 1);
    const minute = Math.floor(Math.random() * 60);
    checkOutDate.setHours(hour, minute, 0, 0);
  } else {
    // Full day: 5:00 PM to 6:30 PM
    const hour = 17 + Math.floor(Math.random() * 1.5);
    const minute = Math.floor(Math.random() * 60);
    checkOutDate.setHours(hour, minute, 0, 0);
  }
  
  return checkOutDate;
};

/**
 * Generate attendance notes based on status
 * @param {string} status - Attendance status
 * @returns {string} - Notes
 */
const generateAttendanceNotes = (status) => {
  const notes = {
    present: ['Regular attendance', 'On time', 'Good performance', ''],
    absent: ['Sick leave', 'Personal leave', 'Emergency', 'Medical appointment'],
    halfday: ['Half day leave', 'Medical appointment', 'Personal work', 'Early departure']
  };
  
  const statusNotes = notes[status] || [''];
  return statusNotes[Math.floor(Math.random() * statusNotes.length)];
};

/**
 * Calculate attendance-based performance rating
 * @param {ObjectId} staffId - Staff member ID
 * @param {Date} startDate - Start date for calculation
 * @param {Date} endDate - End date for calculation
 * @returns {Object} - Performance metrics
 */
const calculateAttendancePerformance = async (staffId, startDate = null, endDate = null) => {
  try {
    // Default to last 30 days if dates not provided
    if (!endDate) endDate = new Date();
    if (!startDate) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    const attendanceRecords = await Attendance.find({
      staffId: staffId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });

    const totalDays = attendanceRecords.length;
    if (totalDays === 0) {
      return {
        rating: 3.0,
        attendanceRate: 0,
        breakdown: {
          totalDays: 0,
          present: 0,
          absent: 0,
          halfday: 0,
          attendanceRate: 0,
          punctualityRate: 0
        }
      };
    }

    // Count attendance types
    const presentDays = attendanceRecords.filter(record => record.status === 'present').length;
    const absentDays = attendanceRecords.filter(record => record.status === 'absent').length;
    const halfdayDays = attendanceRecords.filter(record => record.status === 'halfday').length;

    // Calculate attendance rate (present + 0.5 * halfday) / total
    const attendanceRate = ((presentDays + (halfdayDays * 0.5)) / totalDays) * 100;

    // Calculate punctuality rate (on-time arrivals)
    const onTimeRecords = attendanceRecords.filter(record => {
      if (record.status === 'absent' || !record.checkInTime) return false;
      const checkInHour = record.checkInTime.getHours();
      const checkInMinute = record.checkInTime.getMinutes();
      return checkInHour < 9 || (checkInHour === 9 && checkInMinute <= 0); // On time if before 9:00 AM
    });
    const punctualityRate = totalDays > 0 ? (onTimeRecords.length / (totalDays - absentDays)) * 100 : 0;

    // Calculate performance rating based on attendance patterns
    let rating = 3.0; // Base rating

    // Attendance rate impact (0-2 points)
    if (attendanceRate >= 95) rating += 2.0;
    else if (attendanceRate >= 90) rating += 1.5;
    else if (attendanceRate >= 85) rating += 1.0;
    else if (attendanceRate >= 80) rating += 0.5;
    else if (attendanceRate < 70) rating -= 1.0;

    // Punctuality impact (0-0.5 points)
    if (punctualityRate >= 95) rating += 0.5;
    else if (punctualityRate >= 90) rating += 0.3;
    else if (punctualityRate >= 85) rating += 0.2;
    else if (punctualityRate < 70) rating -= 0.3;

    // Consistency bonus (few absences in a row)
    const consecutiveAbsences = calculateConsecutiveAbsences(attendanceRecords);
    if (consecutiveAbsences >= 3) rating -= 0.5;

    // Cap the rating between 1.0 and 5.0
    rating = Math.max(1.0, Math.min(5.0, rating));

    return {
      rating: Math.round(rating * 10) / 10, // Round to 1 decimal place
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      breakdown: {
        totalDays,
        present: presentDays,
        absent: absentDays,
        halfday: halfdayDays,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        punctualityRate: Math.round(punctualityRate * 10) / 10,
        consecutiveAbsences
      }
    };
  } catch (error) {
    console.error('Error calculating attendance performance:', error);
    return {
      rating: 3.0,
      attendanceRate: 0,
      breakdown: {
        totalDays: 0,
        present: 0,
        absent: 0,
        halfday: 0,
        attendanceRate: 0,
        punctualityRate: 0
      }
    };
  }
};

/**
 * Calculate consecutive absences
 * @param {Array} attendanceRecords - Array of attendance records
 * @returns {number} - Maximum consecutive absences
 */
const calculateConsecutiveAbsences = (attendanceRecords) => {
  let maxConsecutive = 0;
  let currentConsecutive = 0;

  for (const record of attendanceRecords) {
    if (record.status === 'absent') {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }

  return maxConsecutive;
};

/**
 * Update staff performance based on attendance
 * @param {ObjectId} staffId - Staff member ID
 */
const updateStaffPerformanceFromAttendance = async (staffId) => {
  try {
    const staffProfile = await StaffProfile.findById(staffId);
    if (!staffProfile) {
      throw new Error('Staff profile not found');
    }

    const performanceData = await calculateAttendancePerformance(staffId);
    
    // Update staff profile with calculated performance
    staffProfile.performance = {
      ...staffProfile.performance,
      rating: performanceData.rating,
      attendanceBasedRating: performanceData.rating,
      lastUpdated: new Date()
    };

    staffProfile.attendance = {
      ...staffProfile.attendance,
      totalDaysWorked: performanceData.breakdown.present + performanceData.breakdown.halfday,
      absences: performanceData.breakdown.absent,
      totalHoursWorked: (performanceData.breakdown.present * 8) + (performanceData.breakdown.halfday * 4) // Assuming 8 hours full day, 4 hours half day
    };

    await staffProfile.save();
    
    console.log(`✅ Updated performance for staff ${staffId}: Rating ${performanceData.rating}, Attendance ${performanceData.attendanceRate}%`);
    
    return performanceData;
  } catch (error) {
    console.error('Error updating staff performance from attendance:', error);
    throw error;
  }
};

module.exports = {
  generateAttendanceRecords,
  calculateAttendancePerformance,
  updateStaffPerformanceFromAttendance,
  generateRealisticAttendanceStatus,
  generateCheckInTime,
  generateCheckOutTime
}; 