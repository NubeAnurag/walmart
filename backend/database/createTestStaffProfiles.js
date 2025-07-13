const mongoose = require('mongoose');
const User = require('../models/User');
const StaffProfile = require('../models/StaffProfile');
const Store = require('../models/Store');
require('dotenv').config();

const createTestStaffProfiles = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for creating staff profiles...');

    // Get the first store
    const stores = await Store.find({});
    if (stores.length === 0) {
      console.log('No stores found. Please run seedData.js first.');
      return;
    }

    const store = stores[0];
    console.log(`📍 Using store: ${store.name} (${store._id})`);

    // Get the manager for this store
    const manager = await User.findOne({ role: 'manager', storeId: store._id });
    console.log(`👤 Manager: ${manager?.firstName} ${manager?.lastName} (${manager?._id})`);

    // Get or create staff users
    let staffUsers = await User.find({ role: 'staff' });
    console.log(`📊 Found ${staffUsers.length} staff users`);

    // If no staff users exist, create some
    if (staffUsers.length === 0) {
      console.log('Creating test staff users...');
      
      const testStaffUsers = [
        {
          email: 'cashier1@test.com',
          password: 'password123',
          role: 'staff',
          staffType: 'cashier',
          firstName: 'Bob',
          lastName: 'Johnson',
          phone: '+15553456789',
          employeeId: 'CASH001',
          storeId: store._id,
          authProvider: 'local',
          isActive: true
        },
        {
          email: 'inventory1@test.com',
          password: 'password123',
          role: 'staff',
          staffType: 'inventory',
          firstName: 'Alice',
          lastName: 'Smith',
          phone: '+15554567890',
          employeeId: 'INV001',
          storeId: store._id,
          authProvider: 'local',
          isActive: true
        },
        {
          email: 'cashier2@test.com',
          password: 'password123',
          role: 'staff',
          staffType: 'cashier',
          firstName: 'Mike',
          lastName: 'Wilson',
          phone: '+15555678901',
          employeeId: 'CASH002',
          storeId: store._id,
          authProvider: 'local',
          isActive: true
        },
        {
          email: 'inventory2@test.com',
          password: 'password123',
          role: 'staff',
          staffType: 'inventory',
          firstName: 'Sarah',
          lastName: 'Davis',
          phone: '+15556789012',
          employeeId: 'INV002',
          storeId: store._id,
          authProvider: 'local',
          isActive: true
        },
        {
          email: 'cashier3@test.com',
          password: 'password123',
          role: 'staff',
          staffType: 'cashier',
          firstName: 'David',
          lastName: 'Brown',
          phone: '+15557890123',
          employeeId: 'CASH003',
          storeId: store._id,
          authProvider: 'local',
          isActive: true
        }
      ];

      // Create staff users
      for (const userData of testStaffUsers) {
        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
          const user = new User(userData);
          await user.save();
          console.log(`✅ Created staff user: ${user.email}`);
        }
      }

      // Refresh staff users list
      staffUsers = await User.find({ role: 'staff' });
    }

    // Clear existing staff profiles
    await StaffProfile.deleteMany({ storeId: store._id });
    console.log('🧹 Cleared existing staff profiles');

    // Create staff profiles
    const staffProfiles = [];
    
    // Valid enum values from the schema
    const departments = ['Electronics', 'Clothing', 'Food', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Health', 'Automotive', 'Customer Service', 'General'];
    const positions = ['Sales Associate', 'Cashier', 'Stock Clerk', 'Department Manager', 'Shift Supervisor', 'Customer Service', 'Security', 'Maintenance', 'Other'];
    const staffTypes = ['cashier', 'inventory'];

    for (let i = 0; i < staffUsers.length; i++) {
      const user = staffUsers[i];
      
      // Skip if user already has a profile
      const existingProfile = await StaffProfile.findOne({ userId: user._id });
      if (existingProfile) {
        console.log(`⚠️ Profile already exists for ${user.email}`);
        continue;
      }

      const department = departments[i % departments.length];
      const position = positions[i % positions.length];
      const staffType = user.staffType || staffTypes[i % staffTypes.length];
      
      const staffProfile = new StaffProfile({
        userId: user._id,
        storeId: store._id,
        employeeId: user.employeeId || `EMP${String(i + 1).padStart(3, '0')}`,
        position: position,
        department: department,
        staffType: staffType,
        hourlyRate: 15 + Math.floor(Math.random() * 10), // $15-25/hour
        hireDate: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)), // Random date in past year
        managerId: manager?._id,
        isActive: true,
        performance: {
          rating: 3.5 + Math.random() * 1.5, // 3.5-5.0 rating
          lastReview: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)), // Last 90 days
          nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Next 90 days
          goals: ['Improve customer satisfaction', 'Reduce processing time', 'Complete training modules'],
          achievements: ['Employee of the month', 'Perfect attendance'],
          areas_for_improvement: ['Time management', 'Product knowledge']
        },
        attendance: {
          totalDaysWorked: 20 + Math.floor(Math.random() * 10),
          totalHoursWorked: 160 + Math.floor(Math.random() * 40),
          absences: Math.floor(Math.random() * 3),
          lateArrivals: Math.floor(Math.random() * 5)
        },
        skills: ['Customer Service', 'Product Knowledge', 'POS Systems', 'Inventory Management'].slice(0, 2 + Math.floor(Math.random() * 3)),
        emergencyContact: {
          name: `Emergency Contact ${i + 1}`,
          relationship: ['Spouse', 'Parent', 'Sibling', 'Friend'][Math.floor(Math.random() * 4)],
          phone: `+1555${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
          email: `emergency${i + 1}@example.com`
        },
        certifications: [
          {
            name: 'CPR Certification',
            issuedBy: 'American Red Cross',
            issuedDate: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            certificateId: `CPR${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
          },
          {
            name: 'First Aid',
            issuedBy: 'American Red Cross',
            issuedDate: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            certificateId: `FA${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
          }
        ].slice(0, 1 + Math.floor(Math.random() * 2)) // 1-2 certifications
      });

      await staffProfile.save();
      staffProfiles.push(staffProfile);
      console.log(`✅ Created staff profile for ${user.firstName} ${user.lastName} (${user.email})`);
    }

    console.log(`\n🎉 Created ${staffProfiles.length} staff profiles successfully!`);
    console.log(`📍 All staff profiles are linked to store: ${store.name}`);
    console.log(`👤 Manager: ${manager?.firstName} ${manager?.lastName}`);
    
    console.log('\n📋 Staff Members Created:');
    staffProfiles.forEach(profile => {
      const user = staffUsers.find(u => u._id.equals(profile.userId));
      console.log(`  - ${user?.firstName} ${user?.lastName} (${profile.position} - ${profile.department}) - ${user?.email}`);
    });

    console.log('\n🔑 Login credentials for staff members:');
    staffUsers.forEach(user => {
      console.log(`  - ${user.email} / password123`);
    });

  } catch (error) {
    console.error('❌ Error creating staff profiles:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  createTestStaffProfiles();
}

module.exports = createTestStaffProfiles; 