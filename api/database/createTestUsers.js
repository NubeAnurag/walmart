const mongoose = require('mongoose');
const User = require('../models/User');
const Store = require('../models/Store');
require('dotenv').config();

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for creating test users...');

    // Get stores for manager and staff users
    const stores = await Store.find({});
    if (stores.length === 0) {
      console.log('No stores found. Please run seedData.js first.');
      return;
    }

    const testUsers = [
      // Customer
      {
        email: 'customer@test.com',
        password: 'password123',
        role: 'customer',
        firstName: 'John',
        lastName: 'Customer',
        phone: '+15551234567',
        authProvider: 'local',
        isActive: true
      },
      // Manager
      {
        email: 'manager@test.com',
        password: 'password123',
        role: 'manager',
        firstName: 'Jane',
        lastName: 'Manager',
        phone: '+15552345678',
        employeeId: 'MGR001',
        storeId: stores[0]._id,
        authProvider: 'local',
        isActive: true
      },
      // Staff - Cashier
      {
        email: 'cashier@test.com',
        password: 'password123',
        role: 'staff',
        staffType: 'cashier',
        firstName: 'Bob',
        lastName: 'Cashier',
        phone: '+15553456789',
        employeeId: 'CASH001',
        storeId: stores[0]._id,
        authProvider: 'local',
        isActive: true
      },
      // Staff - Inventory
      {
        email: 'inventory@test.com',
        password: 'password123',
        role: 'staff',
        staffType: 'inventory',
        firstName: 'Alice',
        lastName: 'Inventory',
        phone: '+15554567890',
        employeeId: 'INV001',
        storeId: stores[0]._id,
        authProvider: 'local',
        isActive: true
      },
      // Supplier
      {
        email: 'supplier@test.com',
        password: 'password123',
        role: 'supplier',
        firstName: 'Mike',
        lastName: 'Supplier',
        phone: '+15555678901',
        storeIds: [stores[0]._id, stores[1]._id],
        authProvider: 'local',
        isActive: true
      }
    ];

    // Remove existing test users
    await User.deleteMany({ 
      email: { $in: testUsers.map(u => u.email) } 
    });

    // Create test users
    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created ${user.role} user: ${user.email}`);
    }

    console.log('\n🎉 Test users created successfully!');
    console.log('\n📋 Login credentials:');
    console.log('Customer: customer@test.com / password123');
    console.log('Manager: manager@test.com / password123');
    console.log('Staff (Cashier): cashier@test.com / password123');
    console.log('Staff (Inventory): inventory@test.com / password123');
    console.log('Supplier: supplier@test.com / password123');
    console.log('Admin: alexmorgan34@gmail.com / walmart047@admin_login');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  createTestUsers();
}

module.exports = createTestUsers; 