const mongoose = require('mongoose');
const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');
const Sale = require('./models/Sale');
require('dotenv').config();

const testCustomerPurchase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find customer
    const customer = await User.findOne({ email: 'kartik@gmail.com', role: 'customer' });
    if (!customer) {
      console.log('❌ Customer not found');
      return;
    }
    console.log('👤 Customer:', customer.firstName, customer.lastName);

    // Find store with inventory
    const storeId = '687402bb046ea434725bcebd'; // Downtown store
    const store = await Store.findById(storeId);
    console.log('🏪 Store:', store.name);

    // Find product with inventory
    const inventoryItem = await Inventory.findOne({ storeId: storeId })
      .populate('productId');
    if (!inventoryItem || inventoryItem.quantity <= 0) {
      console.log('❌ No product with stock found');
      return;
    }
    console.log('📦 Product:', inventoryItem.productId.name, 'Stock:', inventoryItem.quantity);

    // Check current inventory
    const beforeQuantity = inventoryItem.quantity;
    console.log(`📊 Before purchase: ${beforeQuantity} units`);

    // Simulate creating a sale (similar to what customerController.createOrder does)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Generate transaction ID
      const generateTransactionId = () => {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substr(2, 5);
        return `CUS-${timestamp}-${randomStr}`.toUpperCase();
      };

      const transactionId = generateTransactionId();
      const quantity = 1;
      const product = inventoryItem.productId;

      // Update product stock
      await Product.findByIdAndUpdate(
        product._id,
        { $inc: { stock: -quantity } },
        { session }
      );

      // Update inventory (this is the fix we added)
      const inventoryUpdate = await Inventory.findOneAndUpdate(
        { productId: product._id, storeId: storeId },
        { 
          $inc: { quantity: -quantity },
          $set: { lastSold: new Date() },
          $push: {
            stockMovements: {
              type: 'out',
              quantity: quantity,
              reason: 'Customer purchase',
              reference: transactionId,
              timestamp: new Date(),
              performedBy: customer._id
            }
          }
        },
        { session, new: true }
      );

      // Create sale record
      const sale = new Sale({
        transactionId,
        storeId,
        customerId: customer._id,
        staffId: customer._id,
        items: [{
          productId: product._id,
          name: product.name,
          quantity: quantity,
          unitPrice: product.price,
          totalPrice: product.price * quantity
        }],
        subtotal: product.price * quantity,
        totalAmount: product.price * quantity,
        paymentMethod: 'cash',
        customerInfo: {
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          phone: customer.phone || '',
          isNewCustomer: false
        },
        saleDate: new Date(),
        status: 'completed',
        saleType: 'regular',
        channel: 'online'
      });

      await sale.save({ session });

      // Commit transaction
      await session.commitTransaction();

      console.log('✅ Purchase completed successfully!');
      console.log('💰 Transaction ID:', transactionId);
      console.log('📦 Updated inventory:', inventoryUpdate ? inventoryUpdate.quantity : 'Not found');

      // Verify the update
      const afterInventory = await Inventory.findOne({ 
        storeId: storeId,
        productId: product._id
      });
      
      console.log(`📊 After purchase: ${afterInventory.quantity} units`);
      console.log(`📈 Change: ${beforeQuantity} → ${afterInventory.quantity} (${afterInventory.quantity - beforeQuantity})`);

      // Show recent stock movements
      if (afterInventory.stockMovements && afterInventory.stockMovements.length > 0) {
        console.log('\\n📋 Recent stock movements:');
        afterInventory.stockMovements.slice(-3).forEach((movement, index) => {
          console.log(`  ${index + 1}. ${movement.type} - ${movement.quantity} units - ${movement.reason} (${movement.timestamp.toLocaleString()})`);
        });
      }

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

testCustomerPurchase(); 