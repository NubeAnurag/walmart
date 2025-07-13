const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const deleteCustomerData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find all customers first to see what we're deleting
    const customers = await User.find({ role: 'customer' });
    console.log(`📊 Found ${customers.length} customer(s) in database:`);
    
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.firstName} ${customer.lastName} (${customer.email})`);
    });
    
    if (customers.length === 0) {
      console.log('✅ No customers found in database');
      return;
    }
    
    // Delete all customers
    const deleteResult = await User.deleteMany({ role: 'customer' });
    
    console.log(`🗑️  Successfully deleted ${deleteResult.deletedCount} customer(s) from database`);
    
    // Verify deletion
    const remainingCustomers = await User.find({ role: 'customer' });
    console.log(`✅ Verification: ${remainingCustomers.length} customer(s) remaining in database`);
    
  } catch (error) {
    console.error('❌ Error deleting customer data:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
deleteCustomerData(); 