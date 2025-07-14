const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Store = require('./models/Store');

const getManagerId = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/walmart-digital-revolution');
    
    const manager = await User.findOne({ 
      email: 'manasadhikari0505@gmail.com',
      role: 'manager',
      isActive: true
    });
    
    if (manager) {
      console.log('Manager User ID:', manager._id.toString());
      console.log('Manager Store ID:', manager.storeId.toString());
    } else {
      console.log('Manager not found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

getManagerId(); 