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

const deleteOrderByNumber = async (orderNumber) => {
  try {
    console.log(`🔍 Searching for order: ${orderNumber}`);
    
    // Find the order by order number
    const order = await ManagerOrder.findOne({ orderNumber });
    
    if (!order) {
      console.log(`❌ Order ${orderNumber} not found`);
      return;
    }
    
    console.log(`📋 Found order: ${order.orderNumber}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Manager: ${order.managerName}`);
    console.log(`   Supplier: ${order.supplierName}`);
    console.log(`   Total: $${order.totalAmount}`);
    console.log(`   Created: ${order.createdAt}`);
    
    // Delete the order (soft delete)
    order.isActive = false;
    order.status = 'cancelled';
    order.timeline.push({
      status: 'cancelled',
      updatedBy: order.managerId,
      notes: 'Order deleted via script'
    });
    
    await order.save();
    
    console.log(`✅ Order ${orderNumber} deleted successfully`);
    
  } catch (error) {
    console.error('❌ Error deleting order:', error);
  }
};

const main = async () => {
  await connectDB();
  await deleteOrderByNumber('MO-20250712-0001');
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
};

main().catch(console.error); 