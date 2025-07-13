const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const StaffProfile = require('./models/StaffProfile');
const Store = require('./models/Store');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/walmart-digital-revolution');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkStaffData = async () => {
  try {
    console.log('\n🔍 Checking Staff Data...\n');

    // Get all users with role 'staff'
    const staffUsers = await User.find({ role: 'staff', isActive: true })
      .populate('storeId')
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${staffUsers.length} staff users in User collection:`);
    staffUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`     Employee ID: ${user.employeeId}`);
      console.log(`     Staff Type: ${user.staffType}`);
      console.log(`     Store: ${user.storeId?.name || 'NOT ASSIGNED'} (${user.storeId?.storeCode || 'N/A'})`);
      console.log(`     Store ID: ${user.storeId?._id || 'NONE'}`);
      console.log('');
    });

    // Get all staff profiles
    const staffProfiles = await StaffProfile.find({ isActive: true })
      .populate('userId', 'firstName lastName email')
      .populate('storeId', 'name storeCode')
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${staffProfiles.length} staff profiles in StaffProfile collection:`);
    staffProfiles.forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profile.userId?.firstName} ${profile.userId?.lastName} (${profile.userId?.email})`);
      console.log(`     Employee ID: ${profile.employeeId}`);
      console.log(`     Position: ${profile.position}`);
      console.log(`     Department: ${profile.department}`);
      console.log(`     Store: ${profile.storeId?.name || 'NOT ASSIGNED'} (${profile.storeId?.storeCode || 'N/A'})`);
      console.log(`     Store ID: ${profile.storeId?._id || 'NONE'}`);
      console.log('');
    });

    // Check for staff users without profiles
    console.log('🔍 Checking for staff users without profiles...\n');
    const staffUserIds = staffProfiles.map(profile => profile.userId?._id?.toString()).filter(Boolean);
    const usersWithoutProfiles = staffUsers.filter(user => 
      !staffUserIds.includes(user._id.toString())
    );

    if (usersWithoutProfiles.length > 0) {
      console.log(`❌ Found ${usersWithoutProfiles.length} staff users WITHOUT StaffProfile records:`);
      usersWithoutProfiles.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`     Employee ID: ${user.employeeId}`);
        console.log(`     Staff Type: ${user.staffType}`);
        console.log(`     Store: ${user.storeId?.name || 'NOT ASSIGNED'}`);
        console.log('');
      });

      // Option to create missing profiles
      console.log('🔧 Creating missing StaffProfile records...\n');
      
      for (const user of usersWithoutProfiles) {
        try {
          const newStaffProfile = new StaffProfile({
            userId: user._id,
            storeId: user.storeId,
            employeeId: user.employeeId,
            staffType: user.staffType,
            position: user.staffType === 'cashier' ? 'Cashier' : 'Stock Clerk',
            department: user.staffType === 'cashier' ? 'Customer Service' : 'General',
            hourlyRate: 15.00, // Default hourly rate
            hireDate: user.createdAt || new Date(),
            managerId: null, // Will be set later
            isActive: true,
            performance: {
              rating: 3,
              lastReview: null,
              nextReview: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) // 6 months from now
            },
            attendance: {
              totalDaysWorked: 0,
              totalHoursWorked: 0,
              absences: 0,
              lateArrivals: 0
            }
          });

          await newStaffProfile.save();
          console.log(`✅ Created StaffProfile for ${user.firstName} ${user.lastName}`);
        } catch (error) {
          console.error(`❌ Error creating StaffProfile for ${user.firstName} ${user.lastName}:`, error.message);
        }
      }
    } else {
      console.log('✅ All staff users have corresponding StaffProfile records');
    }

    // Check for specific manager and their store
    console.log('\n🔍 Checking for Manas Adhikari (manager) and his store...\n');
    const manager = await User.findOne({ 
      $or: [
        { firstName: /manas/i, lastName: /adhikari/i },
        { email: /manas/i }
      ],
      role: 'manager',
      isActive: true
    }).populate('storeId');

    if (manager) {
      console.log(`👨‍💼 Found manager: ${manager.firstName} ${manager.lastName} (${manager.email})`);
      console.log(`   Employee ID: ${manager.employeeId}`);
      console.log(`   Store: ${manager.storeId?.name || 'NOT ASSIGNED'} (${manager.storeId?.storeCode || 'N/A'})`);
      console.log(`   Store ID: ${manager.storeId?._id || 'NONE'}`);

      if (manager.storeId) {
        // Check staff in this manager's store
        const storeStaffProfiles = await StaffProfile.find({ 
          storeId: manager.storeId._id,
          isActive: true 
        }).populate('userId', 'firstName lastName email');

        console.log(`\n📊 Staff in ${manager.storeId.name}:`);
        if (storeStaffProfiles.length > 0) {
          storeStaffProfiles.forEach((profile, index) => {
            console.log(`  ${index + 1}. ${profile.userId?.firstName} ${profile.userId?.lastName} (${profile.userId?.email})`);
            console.log(`     Position: ${profile.position}`);
            console.log(`     Department: ${profile.department}`);
          });
        } else {
          console.log('  ❌ No staff found in this store');
        }

        // Check if Anuj Rai is in this store
        const anujRai = await User.findOne({
          $or: [
            { firstName: /anuj/i, lastName: /rai/i },
            { email: /anuj/i }
          ],
          role: 'staff',
          isActive: true
        });

        if (anujRai) {
          console.log(`\n👤 Found Anuj Rai: ${anujRai.firstName} ${anujRai.lastName} (${anujRai.email})`);
          console.log(`   Store ID: ${anujRai.storeId}`);
          console.log(`   Manager's Store ID: ${manager.storeId._id}`);
          console.log(`   Same store? ${anujRai.storeId?.toString() === manager.storeId._id.toString()}`);

          if (anujRai.storeId?.toString() !== manager.storeId._id.toString()) {
            console.log(`\n🔧 Fixing Anuj Rai's store assignment...`);
            anujRai.storeId = manager.storeId._id;
            await anujRai.save();
            console.log(`✅ Updated Anuj Rai's store assignment`);

            // Update StaffProfile if exists
            const anujProfile = await StaffProfile.findOne({ userId: anujRai._id });
            if (anujProfile) {
              anujProfile.storeId = manager.storeId._id;
              await anujProfile.save();
              console.log(`✅ Updated Anuj Rai's StaffProfile store assignment`);
            }
          }
        } else {
          console.log('\n❌ Anuj Rai not found');
        }
      }
    } else {
      console.log('❌ Manas Adhikari (manager) not found');
    }

    // Final verification
    console.log('\n🔍 Final verification - Staff API simulation...\n');
    if (manager && manager.storeId) {
      const finalStaffCheck = await StaffProfile.aggregate([
        { $match: { storeId: manager.storeId._id, isActive: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $addFields: {
            fullName: { $concat: ['$user.firstName', ' ', '$user.lastName'] }
          }
        }
      ]);

      console.log(`📊 Final staff count for ${manager.storeId.name}: ${finalStaffCheck.length}`);
      finalStaffCheck.forEach((staff, index) => {
        console.log(`  ${index + 1}. ${staff.fullName} - ${staff.position} (${staff.department})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking staff data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

// Run the check
const main = async () => {
  await connectDB();
  await checkStaffData();
};

main().catch(console.error); 