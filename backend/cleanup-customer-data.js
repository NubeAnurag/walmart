const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
const Sale = require('./models/Sale');
require('dotenv').config();

const cleanupCustomerData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find all customers first
    const customers = await User.find({ role: 'customer' });
    console.log(`📊 Found ${customers.length} customer(s) in database`);
    
    if (customers.length === 0) {
      console.log('✅ No customers found in database');
      return;
    }
    
    // Get customer IDs for related data cleanup
    const customerIds = customers.map(customer => customer._id);
    
    // Check for related data
    const customerOrders = await Order.find({ customerId: { $in: customerIds } });
    const customerSales = await Sale.find({ customerId: { $in: customerIds } });
    
    console.log(`📊 Found ${customerOrders.length} order(s) related to customers`);
    console.log(`📊 Found ${customerSales.length} sale(s) related to customers`);
    
    // Delete related data first
    if (customerOrders.length > 0) {
      const orderDeleteResult = await Order.deleteMany({ customerId: { $in: customerIds } });
      console.log(`🗑️  Deleted ${orderDeleteResult.deletedCount} customer order(s)`);
    }
    
    if (customerSales.length > 0) {
      const saleDeleteResult = await Sale.deleteMany({ customerId: { $in: customerIds } });
      console.log(`🗑️  Deleted ${saleDeleteResult.deletedCount} customer sale(s)`);
    }
    
    // Delete customers
    const customerDeleteResult = await User.deleteMany({ role: 'customer' });
    console.log(`🗑️  Deleted ${customerDeleteResult.deletedCount} customer(s)`);
    
    // Verify cleanup
    const remainingCustomers = await User.find({ role: 'customer' });
    const remainingOrders = await Order.find({ customerId: { $in: customerIds } });
    const remainingSales = await Sale.find({ customerId: { $in: customerIds } });
    
    console.log('\n✅ Cleanup verification:');
    console.log(`   - Customers remaining: ${remainingCustomers.length}`);
    console.log(`   - Customer orders remaining: ${remainingOrders.length}`);
    console.log(`   - Customer sales remaining: ${remainingSales.length}`);
    
    console.log('\n🎉 Customer data cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during customer data cleanup:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
cleanupCustomerData(); 