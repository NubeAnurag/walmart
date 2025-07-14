const mongoose = require('mongoose');
const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the manager anurag12@gmail.com
    const manager = await User.findOne({ 
      email: 'anurag12@gmail.com', 
      role: 'manager' 
    }).populate('storeId');
    
    if (!manager) {
      console.log('❌ Manager not found');
      return;
    }
    
    console.log('👨‍💼 Manager:', manager.firstName, manager.lastName);
    console.log('🏪 Store:', manager.storeId.name);
    console.log('🏪 Store Code:', manager.storeId.storeCode);
    console.log('🏪 Store ID:', manager.storeId._id);
    
    // Get inventory for manager's store
    const inventory = await Inventory.find({ storeId: manager.storeId._id })
      .populate('productId', 'name price category')
      .sort({ 'productId.name': 1 });
    
    console.log(`\n📦 Current Inventory (${inventory.length} items):`);
    inventory.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.productId.name} - ${item.quantity} units - $${item.productId.price}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
})(); 