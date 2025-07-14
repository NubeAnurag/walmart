const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Set mongoose to not buffer commands
    mongoose.set('bufferCommands', false);
    
    // MongoDB connection string - updated for better compatibility
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital?retryWrites=true&w=majority&appName=Cluster0';
    
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('🌐 Connection string:', mongoURI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout
      socketTimeoutMS: 60000, // 60 seconds socket timeout
      maxPoolSize: 10,
      minPoolSize: 1,
      bufferCommands: false,
      maxIdleTimeMS: 30000
    });

    console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
    console.log(`🏪 Database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Provide specific error guidance
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Tip: Check if MongoDB Atlas is accessible from your network');
      console.log('💡 Tip: Verify your IP is whitelisted in MongoDB Atlas');
    } else if (error.message.includes('authentication')) {
      console.log('💡 Tip: Check your MongoDB username and password');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Tip: Network timeout - check your internet connection');
    }
    
    // Don't crash the server, just log the error and continue
    console.log('⚠️ Server will continue without database connection');
    console.log('🔄 Attempting to reconnect in 30 seconds...');
    
    // Retry connection after 30 seconds
    setTimeout(connectDB, 30000);
    
    return false;
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
  console.log('🔄 Attempting to reconnect...');
  setTimeout(connectDB, 5000);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
  } catch (error) {
    console.log('Error closing MongoDB connection:', error.message);
  }
  process.exit(0);
});

module.exports = connectDB; 