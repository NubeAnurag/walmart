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

const fixAllManagers = async () => {
  try {
    // Get all stores
    const stores = await Store.find({});
    console.log('📍 Available Stores:');
    stores.forEach((store, index) => {
      console.log(`  ${index + 1}. ${store.name} (${store.storeCode}) - ID: ${store._id}`);
    });
    console.log('');

    // Get ALL managers
    const allManagers = await User.find({ role: 'manager' });
    
    console.log('👨‍💼 All Managers (before fix):');
    for (const manager of allManagers) {
      const populatedManager = await User.findById(manager._id).populate('storeId');
      console.log(`  - ${manager.email}: Store = ${populatedManager.storeId?.name || 'NOT ASSIGNED'}`);
    }
    console.log('');

    // Fix each manager
    for (let i = 0; i < allManagers.length; i++) {
      const manager = allManagers[i];
      const store = stores[i % stores.length]; // Round-robin assignment
      
      console.log(`🔧 Fixing manager: ${manager.email}`);
      
      // Generate employeeId if not exists
      if (!manager.employeeId) {
        manager.employeeId = `MGR${Date.now()}${i}`;
        console.log(`  Generated employeeId: ${manager.employeeId}`);
      }
      
      // Assign store
      manager.storeId = store._id;
      await manager.save();
      
      console.log(`  ✅ Assigned to ${store.name} (${store.storeCode})`);
    }

    console.log('\n🎉 All managers have been fixed!');

    // Show final assignments
    console.log('\n📋 Final Manager Assignments:');
    for (const manager of allManagers) {
      const populatedManager = await User.findById(manager._id).populate('storeId');
      console.log(`  - ${manager.email} → ${populatedManager.storeId?.name || 'ERROR'} (${populatedManager.storeId?.storeCode || 'ERROR'})`);
    }

    // Now check what suppliers each manager should see
    console.log('\n🔍 Suppliers each manager should see:');
    for (const manager of allManagers) {
      const populatedManager = await User.findById(manager._id).populate('storeId');
      if (populatedManager.storeId) {
        const Supplier = require('../models/Supplier');
        const suppliers = await Supplier.find({
          assignedStores: populatedManager.storeId._id,
          isActive: true,
          isApproved: true
        });
        
        console.log(`👨‍💼 ${manager.email} (${populatedManager.storeId.name}):`);
        console.log(`   Should see ${suppliers.length} suppliers:`);
        suppliers.forEach(supplier => {
          console.log(`   - ${supplier.companyName}`);
        });
      }
    }

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
  fixAllManagers();
}); 