const mongoose = require('mongoose');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
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

const fixSupplierStoreData = async () => {
  try {
    console.log('🔍 Checking supplier-store relationships...\n');

    // Get all stores
    const stores = await Store.find({});
    console.log('📍 Available Stores:');
    stores.forEach(store => {
      console.log(`  - ${store.name} (${store.storeCode}) - ID: ${store._id}`);
    });
    console.log('');

    // Get all managers
    const managers = await User.find({ role: 'manager' }).populate('storeId');
    console.log('👨‍💼 Managers:');
    managers.forEach(manager => {
      console.log(`  - ${manager.firstName} ${manager.lastName} (${manager.email})`);
      console.log(`    Store: ${manager.storeId?.name || 'NOT ASSIGNED'} (ID: ${manager.storeId?._id || 'N/A'})`);
    });
    console.log('');

    // Get all suppliers
    const suppliers = await Supplier.find({}).populate('assignedStores');
    console.log('🏭 Suppliers:');
    suppliers.forEach(supplier => {
      console.log(`  - ${supplier.companyName}`);
      console.log(`    Active: ${supplier.isActive}, Approved: ${supplier.isApproved}`);
      console.log(`    Assigned Stores: ${supplier.assignedStores.map(s => s.name).join(', ') || 'NONE'}`);
      console.log(`    Store IDs: [${supplier.assignedStores.map(s => s._id).join(', ')}]`);
    });
    console.log('');

    // Get supplier users
    const supplierUsers = await User.find({ role: 'supplier' }).populate('storeIds');
    console.log('👥 Supplier Users:');
    supplierUsers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`    User Store IDs: [${user.storeIds.map(s => s._id).join(', ')}]`);
      console.log(`    User Store Names: [${user.storeIds.map(s => s.name).join(', ')}]`);
    });
    console.log('');

    // Check for inconsistencies and fix them
    console.log('🔧 Checking for issues and fixing...');

    for (const supplierUser of supplierUsers) {
      const supplierProfile = await Supplier.findOne({ userId: supplierUser._id });
      
      if (!supplierProfile) {
        console.log(`❌ Missing Supplier profile for user: ${supplierUser.email}`);
        continue;
      }

      // Check if assignedStores matches user's storeIds
      const userStoreIds = supplierUser.storeIds.map(s => s._id.toString());
      const supplierStoreIds = supplierProfile.assignedStores.map(s => s.toString());

      if (!arraysEqual(userStoreIds, supplierStoreIds)) {
        console.log(`🔄 Fixing store assignment for: ${supplierProfile.companyName}`);
        console.log(`   User stores: [${userStoreIds.join(', ')}]`);
        console.log(`   Supplier stores: [${supplierStoreIds.join(', ')}]`);
        
        supplierProfile.assignedStores = supplierUser.storeIds.map(s => s._id);
        await supplierProfile.save();
        console.log(`✅ Fixed store assignment for: ${supplierProfile.companyName}`);
      }

      // Ensure supplier is active and approved
      if (!supplierProfile.isActive || !supplierProfile.isApproved) {
        console.log(`🔄 Activating and approving supplier: ${supplierProfile.companyName}`);
        supplierProfile.isActive = true;
        supplierProfile.isApproved = true;
        await supplierProfile.save();
        console.log(`✅ Activated and approved: ${supplierProfile.companyName}`);
      }
    }

    console.log('\n🎉 Data consistency check complete!');

    // Final verification - check what each manager should see
    console.log('\n🔍 Final verification - What each manager should see:');
    for (const manager of managers) {
      if (!manager.storeId) {
        console.log(`❌ Manager ${manager.email} has no store assigned!`);
        continue;
      }

      const suppliersForManager = await Supplier.find({
        assignedStores: manager.storeId._id,
        isActive: true,
        isApproved: true
      }).populate('assignedStores', 'name storeCode');

      console.log(`👨‍💼 Manager: ${manager.email} (Store: ${manager.storeId.name})`);
      console.log(`   Should see ${suppliersForManager.length} suppliers:`);
      suppliersForManager.forEach(supplier => {
        console.log(`   - ${supplier.companyName}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
}

// Load environment variables
require('dotenv').config();

// Run the script
connectDB().then(() => {
  fixSupplierStoreData();
}); 