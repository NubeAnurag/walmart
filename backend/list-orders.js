const mongoose = require('mongoose');
const ManagerOrder = require('./models/ManagerOrder');

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

const listAllOrders = async () => {
  try {
    console.log('🔍 Listing all orders...');
    
    // Find all orders
    const orders = await ManagerOrder.find({}).sort({ createdAt: -1 });
    
    if (orders.length === 0) {
      console.log('❌ No orders found');
      return;
    }
    
    console.log(`📋 Found ${orders.length} orders:`);
    console.log('');
    
    orders.forEach((order, index) => {
      console.log(`${index + 1}. Order: ${order.orderNumber}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Manager: ${order.managerName}`);
      console.log(`   Supplier: ${order.supplierName}`);
      console.log(`   Total: $${order.totalAmount}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Active: ${order.isActive !== false ? 'Yes' : 'No'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listing orders:', error);
  }
};

const main = async () => {
  await connectDB();
  await listAllOrders();
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
};

main().catch(console.error); 