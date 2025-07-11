const mongoose = require('mongoose');
const User = require('../models/User');
const Store = require('../models/Store');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://anuragmandal5:anurag123@cluster0.od4oyep.mongodb.net/walmart-revolution?retryWrites=true&w=majority');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const assignManagerToStore = async () => {
  try {
    // Get all stores
    const stores = await Store.find({});
    console.log('📍 Available Stores:');
    stores.forEach((store, index) => {
      console.log(`  ${index + 1}. ${store.name} (${store.storeCode}) - ID: ${store._id}`);
    });
    console.log('');

    // Get unassigned managers
    const unassignedManagers = await User.find({ 
      role: 'manager', 
      storeId: { $exists: false } 
    });
    
    console.log('👨‍💼 Unassigned Managers:');
    unassignedManagers.forEach((manager, index) => {
      console.log(`  ${index + 1}. ${manager.firstName} ${manager.lastName} (${manager.email})`);
    });
    console.log('');

    // Auto-assign managers to stores (round-robin)
    for (let i = 0; i < unassignedManagers.length; i++) {
      const manager = unassignedManagers[i];
      const store = stores[i % stores.length]; // Round-robin assignment
      
      // Generate employeeId if not exists
      if (!manager.employeeId) {
        manager.employeeId = `MGR${Date.now()}${i}`;
      }
      
      manager.storeId = store._id;
      await manager.save();
      
      console.log(`✅ Assigned ${manager.email} to ${store.name} (${store.storeCode})`);
    }

    console.log('\n🎉 All managers have been assigned to stores!');

    // Show final assignments
    const allManagers = await User.find({ role: 'manager' }).populate('storeId');
    console.log('\n📋 Final Manager Assignments:');
    allManagers.forEach(manager => {
      console.log(`  - ${manager.email} → ${manager.storeId?.name || 'NOT ASSIGNED'} (${manager.storeId?.storeCode || 'N/A'})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Load environment variables
require('dotenv').config();

// Run the script
connectDB().then(() => {
  assignManagerToStore();
}); 