const mongoose = require('mongoose');
const ManagerOrder = require('./models/ManagerOrder');
const Order = require('./models/Order');
const PurchaseOrder = require('./models/PurchaseOrder');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkAllOrders = async () => {
  try {
    console.log('🔍 Checking all order collections...\n');
    
    // Check ManagerOrder collection
    console.log('📋 ManagerOrder Collection:');
    const managerOrders = await ManagerOrder.find({}).sort({ createdAt: -1 });
    console.log(`Found ${managerOrders.length} manager orders`);
    managerOrders.forEach(order => {
      console.log(`  - ${order.orderNumber} (${order.status}) - ${order.createdAt}`);
    });
    
    // Check for the specific order
    const specificOrder = await ManagerOrder.findOne({ orderNumber: 'MO-20250712-0001' });
    if (specificOrder) {
      console.log(`\n🎯 Found target order MO-20250712-0001:`);
      console.log(`   ID: ${specificOrder._id}`);
      console.log(`   Status: ${specificOrder.status}`);
      console.log(`   Manager: ${specificOrder.managerId}`);
      console.log(`   Created: ${specificOrder.createdAt}`);
    } else {
      console.log(`\n❌ Order MO-20250712-0001 not found in ManagerOrder collection`);
    }
    
    console.log('\n📋 Order Collection:');
    const orders = await Order.find({}).sort({ createdAt: -1 });
    console.log(`Found ${orders.length} regular orders`);
    orders.forEach(order => {
      console.log(`  - ${order._id} (${order.status}) - ${order.createdAt}`);
    });
    
    console.log('\n📋 PurchaseOrder Collection:');
    const purchaseOrders = await PurchaseOrder.find({}).sort({ createdAt: -1 });
    console.log(`Found ${purchaseOrders.length} purchase orders`);
    purchaseOrders.forEach(order => {
      console.log(`  - ${order._id} (${order.status}) - ${order.createdAt}`);
    });
    
    // Check all collections in the database
    console.log('\n📊 All collections in database:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking orders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

const main = async () => {
  await connectDB();
  await checkAllOrders();
};

main(); 