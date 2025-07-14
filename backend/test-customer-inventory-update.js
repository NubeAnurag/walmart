const mongoose = require('mongoose');
const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');
const Sale = require('./models/Sale');
require('dotenv').config();

const testCustomerInventoryUpdate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a customer
    const customer = await User.findOne({ email: 'kartik@gmail.com', role: 'customer' });
    if (!customer) {
      console.log('❌ Customer not found');
      return;
    }
    console.log('👤 Customer found:', customer.firstName, customer.lastName);

    // Find a store with inventory
    const storeWithInventory = await Inventory.findOne().populate('storeId');
    if (!storeWithInventory) {
      console.log('❌ No store with inventory found');
      return;
    }
    console.log('🏪 Store found:', storeWithInventory.storeId.name);

    // Get a product from inventory
    const inventoryItem = await Inventory.findOne({ storeId: storeWithInventory.storeId._id })
      .populate('productId');
    if (!inventoryItem || inventoryItem.quantity <= 0) {
      console.log('❌ No product with stock found');
      return;
    }
    console.log('📦 Product found:', inventoryItem.productId.name, 'Stock:', inventoryItem.quantity);

    // Check current inventory level
    const beforeQuantity = inventoryItem.quantity;
    console.log(`📊 Before purchase - Inventory: ${beforeQuantity} units`);

    // Find the manager for this store
    const manager = await User.findOne({ 
      storeId: storeWithInventory.storeId._id, 
      role: 'manager' 
    });
    if (manager) {
      console.log('👨‍💼 Manager for this store:', manager.firstName, manager.lastName);
    }

    // Simulate a customer purchase
    console.log('\n🛒 Simulating customer purchase...');
    
    // Create a mock order data
    const orderData = {
      storeId: storeWithInventory.storeId._id,
      items: [{
        productId: inventoryItem.productId._id,
        quantity: 1
      }],
      customerInfo: {
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone || '1234567890'
      },
      paymentMethod: 'cash'
    };

    // This would normally be called through the API
    // Let's check if a sale was created for this customer recently
    const recentSale = await Sale.findOne({
      customerId: customer._id,
      storeId: storeWithInventory.storeId._id
    }).sort({ createdAt: -1 });

    if (recentSale) {
      console.log('💰 Recent sale found:', recentSale.transactionId);
      console.log('📅 Sale date:', recentSale.saleDate);
      console.log('🛍️ Items:', recentSale.items.length);
    }

    // Check inventory after (in case there was a recent purchase)
    const afterInventory = await Inventory.findOne({ 
      storeId: storeWithInventory.storeId._id,
      productId: inventoryItem.productId._id
    });
    
    console.log(`📊 Current inventory: ${afterInventory.quantity} units`);
    
    if (afterInventory.stockMovements && afterInventory.stockMovements.length > 0) {
      console.log('\n📋 Recent stock movements:');
      afterInventory.stockMovements.slice(-3).forEach((movement, index) => {
        console.log(`  ${index + 1}. ${movement.type} - ${movement.quantity} units - ${movement.reason} (${movement.timestamp.toLocaleString()})`);
      });
    }

    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

testCustomerInventoryUpdate(); 