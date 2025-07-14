const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Store = require('./models/Store');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Test staff type functionality
const testStaffTypes = async () => {
  try {
    console.log('\n🧪 Testing Staff Type Functionality...\n');

    // Get a test store
    const store = await Store.findOne({ isActive: true });
    if (!store) {
      console.log('❌ No active store found for testing');
      return;
    }

    console.log(`📍 Using store: ${store.name} (${store.storeCode})`);

    // Test 1: Check existing staff members
    console.log('\n1️⃣ Checking existing staff members:');
    const existingStaff = await User.find({ 
      role: 'staff', 
      isActive: true 
    }).select('firstName lastName email employeeId staffType storeId');

    if (existingStaff.length === 0) {
      console.log('   ℹ️  No existing staff members found');
    } else {
      existingStaff.forEach(staff => {
        console.log(`   👤 ${staff.firstName} ${staff.lastName} (${staff.employeeId})`);
        console.log(`      📧 Email: ${staff.email}`);
        console.log(`      🏷️  Staff Type: ${staff.staffType || 'NOT SET'}`);
        console.log(`      🏪 Store: ${staff.storeId}`);
        console.log('');
      });
    }

    // Test 2: Create test cashier staff
    console.log('\n2️⃣ Creating test cashier staff:');
    try {
      const { generateEmployeeId } = require('./utils/employeeIdGenerator');
      
      const cashierEmployeeId = await generateEmployeeId(store._id, 'staff', 'cashier');
      console.log(`   🆔 Generated Employee ID: ${cashierEmployeeId}`);

      const testCashier = new User({
        email: 'test.cashier@walmart.com',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'Cashier',
        role: 'staff',
        staffType: 'cashier',
        storeId: store._id,
        employeeId: cashierEmployeeId,
        phone: '1234567890',
        authProvider: 'local',
        isActive: true
      });

      await testCashier.save();
      console.log(`   ✅ Created cashier: ${testCashier.firstName} ${testCashier.lastName} (${testCashier.employeeId})`);
    } catch (error) {
      console.log(`   ❌ Failed to create cashier: ${error.message}`);
    }

    // Test 3: Create test inventory staff
    console.log('\n3️⃣ Creating test inventory staff:');
    try {
      const { generateEmployeeId } = require('./utils/employeeIdGenerator');
      
      const inventoryEmployeeId = await generateEmployeeId(store._id, 'staff', 'inventory');
      console.log(`   🆔 Generated Employee ID: ${inventoryEmployeeId}`);

      const testInventory = new User({
        email: 'test.inventory@walmart.com',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'Inventory',
        role: 'staff',
        staffType: 'inventory',
        storeId: store._id,
        employeeId: inventoryEmployeeId,
        phone: '1234567891',
        authProvider: 'local',
        isActive: true
      });

      await testInventory.save();
      console.log(`   ✅ Created inventory staff: ${testInventory.firstName} ${testInventory.lastName} (${testInventory.employeeId})`);
    } catch (error) {
      console.log(`   ❌ Failed to create inventory staff: ${error.message}`);
    }

    // Test 4: Test validation - try to create staff without staffType
    console.log('\n4️⃣ Testing validation (staff without staffType):');
    try {
      const invalidStaff = new User({
        email: 'invalid.staff@walmart.com',
        password: 'testpassword123',
        firstName: 'Invalid',
        lastName: 'Staff',
        role: 'staff',
        // staffType: missing!
        storeId: store._id,
        employeeId: 'TEST-INVALID',
        phone: '1234567892',
        authProvider: 'local',
        isActive: true
      });

      await invalidStaff.save();
      console.log(`   ❌ Validation failed - should not allow staff without staffType`);
    } catch (error) {
      console.log(`   ✅ Validation working correctly: ${error.message}`);
    }

    // Test 5: Test validation - try to create staff with invalid staffType
    console.log('\n5️⃣ Testing validation (invalid staffType):');
    try {
      const invalidStaff = new User({
        email: 'invalid.staff2@walmart.com',
        password: 'testpassword123',
        firstName: 'Invalid',
        lastName: 'Staff2',
        role: 'staff',
        staffType: 'invalid_type',
        storeId: store._id,
        employeeId: 'TEST-INVALID2',
        phone: '1234567893',
        authProvider: 'local',
        isActive: true
      });

      await invalidStaff.save();
      console.log(`   ❌ Validation failed - should not allow invalid staffType`);
    } catch (error) {
      console.log(`   ✅ Validation working correctly: ${error.message}`);
    }

    // Test 6: Check all staff after tests
    console.log('\n6️⃣ Final staff list:');
    const allStaff = await User.find({ 
      role: 'staff', 
      isActive: true 
    }).select('firstName lastName email employeeId staffType storeId').populate('storeId', 'name storeCode');

    allStaff.forEach(staff => {
      console.log(`   👤 ${staff.firstName} ${staff.lastName} (${staff.employeeId})`);
      console.log(`      📧 Email: ${staff.email}`);
      console.log(`      🏷️  Staff Type: ${staff.staffType}`);
      console.log(`      🏪 Store: ${staff.storeId?.name} (${staff.storeId?.storeCode})`);
      console.log('');
    });

    console.log('\n✅ Staff type functionality tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

// Clean up test data
const cleanupTestData = async () => {
  try {
    console.log('\n🧹 Cleaning up test data...');
    
    const result = await User.deleteMany({
      email: { $in: ['test.cashier@walmart.com', 'test.inventory@walmart.com'] }
    });
    
    console.log(`🗑️  Removed ${result.deletedCount} test staff members`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    
    await testStaffTypes();
    
    if (process.argv.includes('--cleanup')) {
      await cleanupTestData();
    } else {
      console.log('\n💡 Run with --cleanup flag to remove test data');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { testStaffTypes, cleanupTestData }; 