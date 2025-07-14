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

// Check manager-store constraint
const checkManagerStoreConstraint = async () => {
  try {
    console.log('\n🔍 Checking Manager-Store Constraint...\n');

    // Get all active stores
    const stores = await Store.find({ isActive: true }).sort({ storeCode: 1 });
    console.log(`📊 Found ${stores.length} active stores\n`);

    // Check each store for managers
    const storeManagerMap = new Map();
    let totalManagers = 0;
    let violationCount = 0;

    for (const store of stores) {
      const managers = await User.find({
        storeId: store._id,
        role: 'manager',
        isActive: true
      }).select('firstName lastName email employeeId');

      console.log(`🏪 Store: ${store.name} (${store.storeCode})`);
      console.log(`   Address: ${store.address}`);
      
      if (managers.length === 0) {
        console.log(`   ⚠️  No manager assigned`);
      } else if (managers.length === 1) {
        const manager = managers[0];
        console.log(`   ✅ Manager: ${manager.firstName} ${manager.lastName} (${manager.employeeId})`);
        console.log(`   📧 Email: ${manager.email}`);
        totalManagers++;
      } else {
        console.log(`   ❌ CONSTRAINT VIOLATION: ${managers.length} managers found!`);
        violationCount++;
        managers.forEach((manager, index) => {
          console.log(`   ${index + 1}. ${manager.firstName} ${manager.lastName} (${manager.employeeId}) - ${manager.email}`);
        });
      }
      
      storeManagerMap.set(store._id.toString(), managers);
      console.log('');
    }

    // Summary
    console.log('📋 SUMMARY:');
    console.log(`   Total Stores: ${stores.length}`);
    console.log(`   Total Managers: ${totalManagers}`);
    console.log(`   Stores with No Manager: ${stores.length - totalManagers - violationCount}`);
    console.log(`   Constraint Violations: ${violationCount}`);
    
    if (violationCount > 0) {
      console.log('\n❌ CONSTRAINT VIOLATIONS DETECTED!');
      console.log('   Action required: Remove duplicate managers from stores');
    } else {
      console.log('\n✅ All stores comply with one-manager-per-store constraint');
    }

    // Check for managers without stores
    const managersWithoutStore = await User.find({
      role: 'manager',
      isActive: true,
      storeId: { $exists: false }
    }).select('firstName lastName email employeeId');

    if (managersWithoutStore.length > 0) {
      console.log('\n⚠️  MANAGERS WITHOUT STORE ASSIGNMENT:');
      managersWithoutStore.forEach(manager => {
        console.log(`   - ${manager.firstName} ${manager.lastName} (${manager.employeeId}) - ${manager.email}`);
      });
    }

    return {
      totalStores: stores.length,
      totalManagers,
      violationCount,
      storesWithoutManager: stores.length - totalManagers - violationCount,
      managersWithoutStore: managersWithoutStore.length
    };

  } catch (error) {
    console.error('❌ Error checking constraint:', error);
    throw error;
  }
};

// Fix constraint violations (if any)
const fixConstraintViolations = async () => {
  try {
    console.log('\n🔧 Checking for constraint violations to fix...\n');

    const stores = await Store.find({ isActive: true });
    let fixedCount = 0;

    for (const store of stores) {
      const managers = await User.find({
        storeId: store._id,
        role: 'manager',
        isActive: true
      }).sort({ createdAt: 1 }); // Keep the oldest manager

      if (managers.length > 1) {
        console.log(`🔧 Fixing violation for store: ${store.name} (${store.storeCode})`);
        console.log(`   Found ${managers.length} managers, keeping the first one`);
        
        const keepManager = managers[0];
        const removeManagers = managers.slice(1);
        
        console.log(`   ✅ Keeping: ${keepManager.firstName} ${keepManager.lastName} (${keepManager.employeeId})`);
        
        for (const manager of removeManagers) {
          console.log(`   ❌ Removing: ${manager.firstName} ${manager.lastName} (${manager.employeeId})`);
          // Option 1: Deactivate the manager
          await User.findByIdAndUpdate(manager._id, { isActive: false });
          // Option 2: Remove store assignment (uncomment if preferred)
          // await User.findByIdAndUpdate(manager._id, { $unset: { storeId: 1 } });
        }
        
        fixedCount++;
      }
    }

    if (fixedCount > 0) {
      console.log(`\n✅ Fixed ${fixedCount} constraint violations`);
    } else {
      console.log('\n✅ No constraint violations found to fix');
    }

    return fixedCount;

  } catch (error) {
    console.error('❌ Error fixing violations:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    
    const stats = await checkManagerStoreConstraint();
    
    if (stats.violationCount > 0) {
      console.log('\n❓ Would you like to fix the constraint violations? (This will deactivate duplicate managers)');
      console.log('   Run with --fix flag to automatically fix violations');
      
      if (process.argv.includes('--fix')) {
        await fixConstraintViolations();
        console.log('\n🔄 Re-checking constraint after fixes...');
        await checkManagerStoreConstraint();
      }
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

module.exports = { checkManagerStoreConstraint, fixConstraintViolations }; 