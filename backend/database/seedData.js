const mongoose = require('mongoose');
const Store = require('../models/Store');
const User = require('../models/User');
require('dotenv').config();

const seedStores = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for seeding...');

    // Clear existing stores
    await Store.deleteMany({});
    console.log('Cleared existing stores');

    // Sample store data
    const stores = [
      {
        name: 'Walmart Supercenter - Downtown',
        storeCode: 'STR01',
        address: '123 Main Street, Downtown, NY 10001',
        phone: '+15551234567'
      },
      {
        name: 'Walmart Supercenter - Uptown',
        storeCode: 'STR02',
        address: '456 Oak Avenue, Uptown, NY 10002',
        phone: '+15552345678'
      },
      {
        name: 'Walmart Neighborhood Market',
        storeCode: 'STR03',
        address: '789 Pine Road, Suburbs, NY 10003',
        phone: '+15553456789'
      },
      {
        name: 'Walmart Supercenter - West Side',
        storeCode: 'STR04',
        address: '321 Elm Street, West Side, NY 10004',
        phone: '+15554567890'
      },
      {
        name: 'Walmart Express - City Center',
        storeCode: 'STR05',
        address: '654 Maple Drive, City Center, NY 10005',
        phone: '+15555678901'
      }
    ];

    // Insert stores
    const createdStores = await Store.insertMany(stores);
    console.log(`✅ Successfully seeded ${createdStores.length} stores:`);
    
    createdStores.forEach(store => {
      console.log(`  - ${store.name} (${store.storeCode}) (ID: ${store._id})`);
    });

    // Create default admin user
    console.log('\n📋 Creating default admin user...');
    
    // Clear existing admin users
    await User.deleteMany({ role: 'admin' });
    
    const defaultAdmin = new User({
      email: 'alexmorgan34@gmail.com',
      password: 'walmart047@admin_login',
      role: 'admin',
      firstName: 'Alex',
      lastName: 'Morgan',
      authProvider: 'local',
      isActive: true
    });

    await defaultAdmin.save();
    console.log('✅ Default admin user created successfully:');
    console.log(`  - Name: ${defaultAdmin.firstName} ${defaultAdmin.lastName}`);
    console.log(`  - Email: ${defaultAdmin.email}`);
    console.log(`  - Role: ${defaultAdmin.role}`);

    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedStores();
}

module.exports = seedStores; 