const mongoose = require('mongoose');
const User = require('./models/User');
const StaffProfile = require('./models/StaffProfile');
const Store = require('./models/Store');
require('dotenv').config();

const testManagerStaff = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the manager
    const manager = await User.findOne({ email: 'anurag12@gmail.com', role: 'manager' }).populate('storeId');
    console.log('👨‍💼 Manager:', manager?.firstName, manager?.lastName, 'Store:', manager?.storeId?.name);
    
    if (!manager || !manager.storeId) {
      console.log('❌ Manager or store not found');
      return;
    }
    
    // Find staff in the manager's store
    const staff = await StaffProfile.find({ 
      storeId: manager.storeId._id,
      isActive: true 
    }).populate('userId', 'firstName lastName email');
    
    console.log('📊 Staff in manager\'s store:', staff.length);
    staff.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.userId?.firstName} ${member.userId?.lastName} (${member.userId?.email})`);
      console.log(`     Position: ${member.position}, Department: ${member.department}`);
    });
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testManagerStaff(); 