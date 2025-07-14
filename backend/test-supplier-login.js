const mongoose = require('mongoose');
const User = require('./models/User');
const Supplier = require('./models/Supplier');
require('dotenv').config();

const testSupplierLogin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for supplier login testing...');

    // Test 1: Check all supplier users
    console.log('\n🔍 === SUPPLIER USERS ===');
    const supplierUsers = await User.find({ role: 'supplier', isActive: true });
    console.log(`Found ${supplierUsers.length} active supplier users:`);
    
    for (const user of supplierUsers) {
      console.log(`  - ${user.email} (ID: ${user._id})`);
      console.log(`    Role: ${user.role}, Active: ${user.isActive}`);
      console.log(`    Has Password: ${!!user.password}`);
      console.log(`    Store IDs: ${user.storeIds?.length || 0}`);
    }

    // Test 2: Check all supplier profiles
    console.log('\n🏪 === SUPPLIER PROFILES ===');
    const supplierProfiles = await Supplier.find({ isActive: true });
    console.log(`Found ${supplierProfiles.length} active supplier profiles:`);
    
    for (const profile of supplierProfiles) {
      console.log(`  - ${profile.companyName} (ID: ${profile._id})`);
      console.log(`    User ID: ${profile.userId}`);
      console.log(`    Active: ${profile.isActive}, Approved: ${profile.isApproved}`);
      console.log(`    Assigned Stores: ${profile.assignedStores?.length || 0}`);
    }

    // Test 3: Check for mismatches
    console.log('\n⚠️ === POTENTIAL ISSUES ===');
    
    // Check users without profiles
    const usersWithoutProfiles = [];
    for (const user of supplierUsers) {
      const profile = await Supplier.findOne({ userId: user._id });
      if (!profile) {
        usersWithoutProfiles.push(user);
      }
    }
    
    if (usersWithoutProfiles.length > 0) {
      console.log('❌ Users without supplier profiles:');
      usersWithoutProfiles.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user._id})`);
      });
    } else {
      console.log('✅ All supplier users have profiles');
    }

    // Check profiles without users
    const profilesWithoutUsers = [];
    for (const profile of supplierProfiles) {
      const user = await User.findById(profile.userId);
      if (!user) {
        profilesWithoutUsers.push(profile);
      }
    }
    
    if (profilesWithoutUsers.length > 0) {
      console.log('❌ Supplier profiles without users:');
      profilesWithoutUsers.forEach(profile => {
        console.log(`  - ${profile.companyName} (User ID: ${profile.userId})`);
      });
    } else {
      console.log('✅ All supplier profiles have users');
    }

    // Check unapproved suppliers
    const unapprovedSuppliers = supplierProfiles.filter(p => !p.isApproved);
    if (unapprovedSuppliers.length > 0) {
      console.log('❌ Unapproved suppliers:');
      unapprovedSuppliers.forEach(profile => {
        console.log(`  - ${profile.companyName} (User ID: ${profile.userId})`);
      });
    } else {
      console.log('✅ All suppliers are approved');
    }

    // Test 4: Test specific login scenario
    console.log('\n🧪 === LOGIN TEST ===');
    const testEmail = 'supplier@test.com';
    const testUser = await User.findOne({ email: testEmail, isActive: true });
    
    if (testUser) {
      console.log(`Testing login for: ${testEmail}`);
      console.log(`  User found: ${!!testUser}`);
      console.log(`  Role: ${testUser.role}`);
      console.log(`  Active: ${testUser.isActive}`);
      console.log(`  Has Password: ${!!testUser.password}`);
      
      const supplierProfile = await Supplier.findOne({ userId: testUser._id });
      if (supplierProfile) {
        console.log(`  Supplier Profile: ${supplierProfile.companyName}`);
        console.log(`  Profile Active: ${supplierProfile.isActive}`);
        console.log(`  Profile Approved: ${supplierProfile.isApproved}`);
      } else {
        console.log('  ❌ No supplier profile found');
      }
    } else {
      console.log(`❌ Test user not found: ${testEmail}`);
    }

  } catch (error) {
    console.error('❌ Error testing supplier login:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  testSupplierLogin();
}

module.exports = testSupplierLogin; 