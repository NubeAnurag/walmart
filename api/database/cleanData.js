const mongoose = require('mongoose');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const StaffProfile = require('../models/StaffProfile');
const Supplier = require('../models/Supplier');
const Task = require('../models/Task');
const PurchaseOrder = require('../models/PurchaseOrder');
const Sale = require('../models/Sale');
const Report = require('../models/Report');
require('dotenv').config();

const cleanData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for cleaning...');

    // Clean all collections except admin users
    console.log('🧹 Cleaning database data...');
    
    // Delete all users except admin
    const deletedUsers = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`✅ Deleted ${deletedUsers.deletedCount} non-admin users`);

    // Delete all other collections
    const deletedProducts = await Product.deleteMany({});
    console.log(`✅ Deleted ${deletedProducts.deletedCount} products`);

    const deletedInventory = await Inventory.deleteMany({});
    console.log(`✅ Deleted ${deletedInventory.deletedCount} inventory items`);

    const deletedStaffProfiles = await StaffProfile.deleteMany({});
    console.log(`✅ Deleted ${deletedStaffProfiles.deletedCount} staff profiles`);

    const deletedSuppliers = await Supplier.deleteMany({});
    console.log(`✅ Deleted ${deletedSuppliers.deletedCount} suppliers`);

    const deletedTasks = await Task.deleteMany({});
    console.log(`✅ Deleted ${deletedTasks.deletedCount} tasks`);

    const deletedPurchaseOrders = await PurchaseOrder.deleteMany({});
    console.log(`✅ Deleted ${deletedPurchaseOrders.deletedCount} purchase orders`);

    const deletedSales = await Sale.deleteMany({});
    console.log(`✅ Deleted ${deletedSales.deletedCount} sales`);

    const deletedReports = await Report.deleteMany({});
    console.log(`✅ Deleted ${deletedReports.deletedCount} reports`);

    // Keep stores but you can optionally clean and reseed them
    console.log('📦 Keeping stores data...');
    
    // Show remaining admin users
    const remainingAdmins = await User.find({ role: 'admin' });
    console.log(`\n👤 Remaining admin users: ${remainingAdmins.length}`);
    remainingAdmins.forEach(admin => {
      console.log(`  - ${admin.firstName} ${admin.lastName} (${admin.email})`);
    });

    console.log('\n🎉 Database cleaning completed successfully!');
    console.log('✅ Admin users preserved');
    console.log('✅ All other user data cleaned');
    console.log('✅ All business data cleaned');
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run cleaning if this file is executed directly
if (require.main === module) {
  cleanData();
}

module.exports = cleanData; 