const mongoose = require('mongoose');
const Store = require('../models/Store');
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
        address: '123 Main Street, Downtown, NY 10001',
        phone: '+15551234567'
      },
      {
        name: 'Walmart Supercenter - Uptown',
        address: '456 Oak Avenue, Uptown, NY 10002',
        phone: '+15552345678'
      },
      {
        name: 'Walmart Neighborhood Market',
        address: '789 Pine Road, Suburbs, NY 10003',
        phone: '+15553456789'
      },
      {
        name: 'Walmart Supercenter - West Side',
        address: '321 Elm Street, West Side, NY 10004',
        phone: '+15554567890'
      },
      {
        name: 'Walmart Express - City Center',
        address: '654 Maple Drive, City Center, NY 10005',
        phone: '+15555678901'
      }
    ];

    // Insert stores
    const createdStores = await Store.insertMany(stores);
    console.log(`✅ Successfully seeded ${createdStores.length} stores:`);
    
    createdStores.forEach(store => {
      console.log(`  - ${store.name} (ID: ${store._id})`);
    });

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