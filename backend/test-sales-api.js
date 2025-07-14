const mongoose = require('mongoose');
const User = require('./models/User');
const Store = require('./models/Store');
const Inventory = require('./models/Inventory');
const Product = require('./models/Product');
require('dotenv').config();

const testSalesAPI = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB for sales API testing');

    // Get a store
    const store = await Store.findOne({ isActive: true });
    if (!store) {
      console.log('❌ No active store found');
      return;
    }
    console.log(`🏪 Using store: ${store.name} (${store.storeCode})`);

    // Get a cashier staff member
    const cashier = await User.findOne({ 
      email: 'anujmart@gmail.com',
      role: 'staff', 
      staffType: 'cashier',
      isActive: true 
    });
    if (!cashier) {
      console.log('❌ No cashier found');
      return;
    }
    console.log(`👤 Using cashier: ${cashier.firstName} ${cashier.lastName} (${cashier.employeeId})`);

    // Get inventory items
    const inventoryItems = await Inventory.find({ storeId: store._id })
      .populate('productId')
      .limit(3);

    if (inventoryItems.length === 0) {
      console.log('❌ No inventory items found');
      return;
    }

    console.log(`📦 Found ${inventoryItems.length} inventory items`);

    // Test sale data
    const testSaleData = {
      customerName: 'John Doe',
      customerEmail: 'john.doe@example.com',
      customerPhone: '1234567890',
      items: inventoryItems.map(item => ({
        productId: item.productId._id.toString(),
        quantity: Math.min(2, item.quantity), // Use minimum of 2 or available quantity
        price: item.productId.price
      })),
      totalAmount: inventoryItems.reduce((sum, item) => {
        const quantity = Math.min(2, item.quantity);
        return sum + (item.productId.price * quantity);
      }, 0),
      storeId: store._id.toString(),
      cashierId: cashier._id.toString()
    };

    console.log('🧪 Test sale data:', JSON.stringify(testSaleData, null, 2));

    // Test the sales API endpoint
    const axios = require('axios');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: cashier.email,
      password: 'password123', // Default test password
      role: 'staff',
      staffType: 'cashier'
    });

    const token = loginResponse.data.token;
    console.log('🔑 Got auth token');

    // Test the sales endpoint
    const salesResponse = await axios.post('http://localhost:5001/api/sales', testSaleData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Sales API test successful!');
    console.log('📄 Response:', JSON.stringify(salesResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Sales API test failed:', error.response?.data || error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  testSalesAPI();
}

module.exports = testSalesAPI; 