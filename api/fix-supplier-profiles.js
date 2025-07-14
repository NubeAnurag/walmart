const mongoose = require('mongoose');
const User = require('./models/User');
const Supplier = require('./models/Supplier');
const Store = require('./models/Store');
require('dotenv').config();

const fixSupplierProfiles = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for fixing supplier profiles...');

    // Get all supplier users
    const supplierUsers = await User.find({ role: 'supplier', isActive: true });
    console.log(`Found ${supplierUsers.length} supplier users`);

    // Get all stores for fallback
    const allStores = await Store.find({ isActive: true });
    console.log(`Found ${allStores.length} active stores`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const user of supplierUsers) {
      console.log(`\n🔍 Checking user: ${user.email}`);
      
      // Check if supplier profile exists
      const existingProfile = await Supplier.findOne({ userId: user._id });
      
      if (existingProfile) {
        console.log(`  ✅ Profile already exists: ${existingProfile.companyName}`);
        skippedCount++;
        continue;
      }

      console.log(`  ❌ No profile found, creating one...`);

      // Determine store IDs to assign
      let storeIds = user.storeIds;
      if (!storeIds || storeIds.length === 0) {
        // If user has no store IDs, assign to first few stores
        storeIds = allStores.slice(0, 3).map(store => store._id);
        console.log(`  📍 No stores assigned, using first 3 stores`);
      }

      // Create supplier profile
      const supplierProfile = new Supplier({
        userId: user._id,
        assignedStores: storeIds,
        companyName: `${user.firstName} ${user.lastName}'s Company`,
        contactPerson: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone || '',
          title: 'Owner'
        },
        companyInfo: {
          industry: 'General',
          establishedYear: new Date().getFullYear()
        },
        address: {
          country: 'USA'
        },
        categories: ['Other'],
        isActive: true,
        isApproved: true // Auto-approve for development
      });

      await supplierProfile.save();
      console.log(`  ✅ Created profile: ${supplierProfile.companyName}`);
      console.log(`    - Assigned to ${storeIds.length} stores`);
      console.log(`    - Active: ${supplierProfile.isActive}`);
      console.log(`    - Approved: ${supplierProfile.isApproved}`);
      
      fixedCount++;
    }

    console.log(`\n🎉 Summary:`);
    console.log(`  - Fixed: ${fixedCount} profiles`);
    console.log(`  - Skipped: ${skippedCount} profiles (already existed)`);
    console.log(`  - Total: ${supplierUsers.length} supplier users`);

    // Verify all users now have profiles
    console.log(`\n🔍 Final verification:`);
    const usersWithoutProfiles = [];
    for (const user of supplierUsers) {
      const profile = await Supplier.findOne({ userId: user._id });
      if (!profile) {
        usersWithoutProfiles.push(user);
      }
    }
    
    if (usersWithoutProfiles.length === 0) {
      console.log(`✅ All supplier users now have profiles!`);
    } else {
      console.log(`❌ Still missing profiles for ${usersWithoutProfiles.length} users:`);
      usersWithoutProfiles.forEach(user => {
        console.log(`  - ${user.email}`);
      });
    }

  } catch (error) {
    console.error('❌ Error fixing supplier profiles:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  fixSupplierProfiles();
}

module.exports = fixSupplierProfiles; 