const mongoose = require('mongoose');

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

const checkAllCollectionsForOrder = async () => {
  try {
    const targetOrderNumber = 'MO-20250712-0001';
    console.log(`🔍 Searching for order: ${targetOrderNumber} in all collections...\n`);
    
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Available collections:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    console.log();
    
    // Search in each collection for the order number
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`🔍 Searching in collection: ${collectionName}`);
      
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        
        // Search for documents with orderNumber field
        const ordersWithNumber = await collection.find({ orderNumber: targetOrderNumber }).toArray();
        
        if (ordersWithNumber.length > 0) {
          console.log(`✅ Found ${ordersWithNumber.length} order(s) in ${collectionName}:`);
          ordersWithNumber.forEach((order, index) => {
            console.log(`  Order ${index + 1}:`);
            console.log(`    - ID: ${order._id}`);
            console.log(`    - Order Number: ${order.orderNumber}`);
            console.log(`    - Status: ${order.status || 'N/A'}`);
            console.log(`    - Created: ${order.createdAt || order.orderDate || 'N/A'}`);
            console.log(`    - Manager ID: ${order.managerId || 'N/A'}`);
            console.log(`    - Supplier ID: ${order.supplierId || 'N/A'}`);
          });
        } else {
          // Also search for any documents that might contain the order number in other fields
          const anyMatch = await collection.find({ 
            $or: [
              { orderNumber: { $regex: 'MO-20250712-0001', $options: 'i' } },
              { 'orderNumber': 'MO-20250712-0001' },
              { '_id': 'MO-20250712-0001' }
            ]
          }).toArray();
          
          if (anyMatch.length > 0) {
            console.log(`⚠️ Found potential matches in ${collectionName}:`);
            anyMatch.forEach(doc => {
              console.log(`    - Document ID: ${doc._id}`);
              console.log(`    - Content: ${JSON.stringify(doc, null, 2).substring(0, 200)}...`);
            });
          } else {
            console.log(`❌ No orders found in ${collectionName}`);
          }
        }
      } catch (err) {
        console.log(`⚠️ Error searching ${collectionName}: ${err.message}`);
      }
      
      console.log();
    }
    
  } catch (error) {
    console.error('❌ Error checking collections:', error);
  } finally {
    console.log('🔌 Disconnecting from MongoDB');
    await mongoose.disconnect();
  }
};

const run = async () => {
  await connectDB();
  await checkAllCollectionsForOrder();
};

run().catch(console.error); 