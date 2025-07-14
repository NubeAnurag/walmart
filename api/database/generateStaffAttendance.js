const mongoose = require('mongoose');
const StaffProfile = require('../models/StaffProfile');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { generateAttendanceRecords, updateStaffPerformanceFromAttendance } = require('../utils/attendanceGenerator');
require('dotenv').config();

const generateStaffAttendanceRecords = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for generating attendance records...');

    // Get all staff profiles
    const staffProfiles = await StaffProfile.find({ isActive: true })
      .populate('userId', 'firstName lastName email')
      .populate('managerId', 'firstName lastName');

    if (staffProfiles.length === 0) {
      console.log('No staff profiles found. Please create staff profiles first.');
      return;
    }

    console.log(`📊 Found ${staffProfiles.length} staff profiles`);

    // Clear existing attendance records (optional - comment out if you want to keep existing records)
    console.log('🧹 Clearing existing attendance records...');
    await Attendance.deleteMany({});
    console.log('✅ Cleared existing attendance records');

    // Generate attendance records for each staff member
    const results = [];
    for (const staffProfile of staffProfiles) {
      try {
        console.log(`\n📅 Processing staff: ${staffProfile.userId?.firstName} ${staffProfile.userId?.lastName} (${staffProfile.employeeId})`);
        
        // Use hire date as start date
        const hireDate = new Date(staffProfile.hireDate);
        const currentDate = new Date();
        
        // Ensure hire date is not in the future
        if (hireDate > currentDate) {
          console.log(`⚠️ Hire date is in the future for ${staffProfile.employeeId}, using current date`);
          hireDate.setTime(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        }

        // Generate attendance records
        const attendanceRecords = await generateAttendanceRecords(
          staffProfile._id,
          staffProfile.managerId || staffProfile._id, // Use staff ID as manager if no manager assigned
          hireDate,
          currentDate
        );

        console.log(`✅ Generated ${attendanceRecords.length} attendance records`);

        // Update performance rating based on attendance
        const performanceData = await updateStaffPerformanceFromAttendance(staffProfile._id);

        results.push({
          staffId: staffProfile._id,
          employeeId: staffProfile.employeeId,
          name: `${staffProfile.userId?.firstName} ${staffProfile.userId?.lastName}`,
          attendanceRecords: attendanceRecords.length,
          performanceRating: performanceData.rating,
          attendanceRate: performanceData.attendanceRate,
          hireDate: hireDate.toISOString().split('T')[0]
        });

        console.log(`📊 Updated performance: Rating ${performanceData.rating}, Attendance ${performanceData.attendanceRate}%`);

      } catch (error) {
        console.error(`❌ Error processing staff ${staffProfile.employeeId}:`, error);
        results.push({
          staffId: staffProfile._id,
          employeeId: staffProfile.employeeId,
          name: `${staffProfile.userId?.firstName} ${staffProfile.userId?.lastName}`,
          error: error.message
        });
      }
    }

    // Summary
    console.log('\n🎉 Attendance Generation Summary:');
    console.log('=====================================');
    
    const successfulRecords = results.filter(r => !r.error);
    const failedRecords = results.filter(r => r.error);
    
    console.log(`✅ Successfully processed: ${successfulRecords.length}`);
    console.log(`❌ Failed to process: ${failedRecords.length}`);
    
    if (successfulRecords.length > 0) {
      console.log('\n📊 Staff Attendance Summary:');
      successfulRecords.forEach(result => {
        console.log(`  - ${result.name} (${result.employeeId})`);
        console.log(`    📅 Hire Date: ${result.hireDate}`);
        console.log(`    📝 Records: ${result.attendanceRecords}`);
        console.log(`    ⭐ Rating: ${result.performanceRating}`);
        console.log(`    📈 Attendance: ${result.attendanceRate}%`);
        console.log('');
      });
    }

    if (failedRecords.length > 0) {
      console.log('\n❌ Failed Records:');
      failedRecords.forEach(result => {
        console.log(`  - ${result.name} (${result.employeeId}): ${result.error}`);
      });
    }

    // Generate some sample attendance statistics
    console.log('\n📈 Overall Statistics:');
    if (successfulRecords.length > 0) {
      const totalRecords = successfulRecords.reduce((sum, r) => sum + r.attendanceRecords, 0);
      const avgRating = successfulRecords.reduce((sum, r) => sum + r.performanceRating, 0) / successfulRecords.length;
      const avgAttendance = successfulRecords.reduce((sum, r) => sum + r.attendanceRate, 0) / successfulRecords.length;
      
      console.log(`  📊 Total attendance records: ${totalRecords}`);
      console.log(`  ⭐ Average performance rating: ${avgRating.toFixed(1)}`);
      console.log(`  📈 Average attendance rate: ${avgAttendance.toFixed(1)}%`);
    }

    // Show attendance status distribution
    const attendanceStats = await Attendance.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📊 Attendance Status Distribution:');
    attendanceStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} records`);
    });

  } catch (error) {
    console.error('❌ Error generating attendance records:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  generateStaffAttendanceRecords();
}

module.exports = generateStaffAttendanceRecords; 