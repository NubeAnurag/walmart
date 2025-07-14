const mongoose = require('mongoose');
const User = require('./models/User');

async function checkManagerAccounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/walmart_digital_revolution', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🔍 Checking manager accounts...\n');

    // Find all manager users
    const managers = await User.find({ role: 'manager' }).populate('storeId');
    
    console.log(`📊 Found ${managers.length} manager accounts:\n`);
    
    managers.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.firstName} ${manager.lastName}`);
      console.log(`   📧 Email: ${manager.email}`);
      console.log(`   🏪 Store: ${manager.storeId?.name || 'No store assigned'}`);
      console.log(`   🆔 Employee ID: ${manager.employeeId}`);
      console.log(`   ✅ Active: ${manager.isActive}`);
      console.log('');
    });

    // Show sample login credentials
    if (managers.length > 0) {
      const sampleManager = managers[0];
      console.log('🔑 Sample login credentials:');
      console.log(`Email: ${sampleManager.email}`);
      console.log('Password: password123 (default)');
      console.log('Role: manager');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkManagerAccounts(); 