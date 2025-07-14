const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');
require('dotenv').config();

const seedSupplierData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get existing stores
    const stores = await Store.find({ isActive: true });
    if (stores.length === 0) {
      console.log('No stores found. Please seed stores first.');
      return;
    }

    // Create a test supplier
    const existingSupplier = await User.findOne({ email: 'supplier@test.com' });
    let supplier;
    
    if (!existingSupplier) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      supplier = new User({
        firstName: 'Test',
        lastName: 'Supplier',
        email: 'supplier@test.com',
        password: hashedPassword,
        role: 'supplier',
        storeIds: stores.map(store => store._id),
        isActive: true
      });
      await supplier.save();
      console.log('Test supplier created');
    } else {
      supplier = existingSupplier;
      // Update the password to ensure it's correct
      const hashedPassword = await bcrypt.hash('password123', 10);
      supplier.password = hashedPassword;
      await supplier.save();
      console.log('Using existing test supplier and updated password');
    }

    // Create sample products
    const sampleProducts = [
      {
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
        price: 99.99,
        category: 'Electronics',
        brand: 'TechSound',
        stock: 50,
        supplierId: supplier._id,
        storeIds: [stores[0]._id, stores[1]._id]
      },
      {
        name: 'Organic Cotton T-Shirt',
        description: 'Comfortable and sustainable organic cotton t-shirt available in multiple colors.',
        price: 24.99,
        category: 'Clothing',
        brand: 'EcoWear',
        stock: 100,
        supplierId: supplier._id,
        storeIds: [stores[0]._id, stores[2]._id]
      },
      {
        name: 'Smart Home Security Camera',
        description: 'HD security camera with night vision, motion detection, and mobile app control.',
        price: 149.99,
        category: 'Electronics',
        brand: 'SecureHome',
        stock: 25,
        supplierId: supplier._id,
        storeIds: [stores[1]._id, stores[2]._id]
      },
      {
        name: 'Ergonomic Office Chair',
        description: 'Adjustable ergonomic office chair with lumbar support and breathable mesh back.',
        price: 299.99,
        category: 'Furniture',
        brand: 'ComfortSeat',
        stock: 15,
        supplierId: supplier._id,
        storeIds: [stores[0]._id]
      },
      {
        name: 'Organic Green Tea',
        description: 'Premium organic green tea with antioxidants, pack of 50 tea bags.',
        price: 12.99,
        category: 'Food & Beverages',
        brand: 'PureLeaf',
        stock: 200,
        supplierId: supplier._id,
        storeIds: stores.map(store => store._id)
      },
      {
        name: 'Yoga Mat Premium',
        description: 'Non-slip yoga mat with extra cushioning, perfect for all yoga practices.',
        price: 39.99,
        category: 'Sports & Outdoors',
        brand: 'ZenFit',
        stock: 75,
        supplierId: supplier._id,
        storeIds: [stores[1]._id, stores[2]._id]
      },
      {
        name: 'LED Desk Lamp',
        description: 'Adjustable LED desk lamp with USB charging port and touch controls.',
        price: 49.99,
        category: 'Office Supplies',
        brand: 'BrightLight',
        stock: 40,
        supplierId: supplier._id,
        storeIds: [stores[0]._id, stores[1]._id]
      },
      {
        name: 'Ceramic Coffee Mug Set',
        description: 'Set of 4 ceramic coffee mugs with modern design, dishwasher safe.',
        price: 29.99,
        category: 'Home & Garden',
        brand: 'HomeStyle',
        stock: 60,
        supplierId: supplier._id,
        storeIds: [stores[2]._id]
      }
    ];

    // Clear existing products for this supplier
    await Product.deleteMany({ supplierId: supplier._id });

    // Create products
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`Created ${createdProducts.length} sample products`);

    // Create a test customer for orders
    const existingCustomer = await User.findOne({ email: 'customer@test.com' });
    let customer;
    
    if (!existingCustomer) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      customer = new User({
        firstName: 'Test',
        lastName: 'Customer',
        email: 'customer@test.com',
        password: hashedPassword,
        role: 'customer',
        isActive: true
      });
      await customer.save();
      console.log('Test customer created');
    } else {
      customer = existingCustomer;
      console.log('Using existing test customer');
    }

    // Create sample orders
    const sampleOrders = [
      {
        customerId: customer._id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        supplierId: supplier._id,
        storeId: stores[0]._id,
        items: [
          {
            productId: createdProducts[0]._id,
            productName: createdProducts[0].name,
            quantity: 2,
            unitPrice: createdProducts[0].price,
            totalPrice: createdProducts[0].price * 2
          },
          {
            productId: createdProducts[1]._id,
            productName: createdProducts[1].name,
            quantity: 1,
            unitPrice: createdProducts[1].price,
            totalPrice: createdProducts[1].price * 1
          }
        ],
        totalAmount: (createdProducts[0].price * 2) + (createdProducts[1].price * 1),
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'United States'
        },
        status: 'Order Received',
        estimatedDeliveryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      {
        customerId: customer._id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        supplierId: supplier._id,
        storeId: stores[1]._id,
        items: [
          {
            productId: createdProducts[2]._id,
            productName: createdProducts[2].name,
            quantity: 1,
            unitPrice: createdProducts[2].price,
            totalPrice: createdProducts[2].price * 1
          }
        ],
        totalAmount: createdProducts[2].price * 1,
        shippingAddress: {
          street: '456 Oak Ave',
          city: 'Somewhere',
          state: 'NY',
          zipCode: '67890',
          country: 'United States'
        },
        status: 'Order Completed',
        estimatedDeliveryTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        actualDeliveryTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        customerId: customer._id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        supplierId: supplier._id,
        storeId: stores[2]._id,
        items: [
          {
            productId: createdProducts[4]._id,
            productName: createdProducts[4].name,
            quantity: 3,
            unitPrice: createdProducts[4].price,
            totalPrice: createdProducts[4].price * 3
          },
          {
            productId: createdProducts[5]._id,
            productName: createdProducts[5].name,
            quantity: 1,
            unitPrice: createdProducts[5].price,
            totalPrice: createdProducts[5].price * 1
          }
        ],
        totalAmount: (createdProducts[4].price * 3) + (createdProducts[5].price * 1),
        shippingAddress: {
          street: '789 Pine Rd',
          city: 'Elsewhere',
          state: 'TX',
          zipCode: '54321',
          country: 'United States'
        },
        status: 'Order Received',
        estimatedDeliveryTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
      }
    ];

    // Clear existing orders for this supplier
    await Order.deleteMany({ supplierId: supplier._id });

    // Create orders one by one to allow pre-save middleware to work
    const createdOrders = [];
    for (const orderData of sampleOrders) {
      const order = new Order(orderData);
      await order.save();
      createdOrders.push(order);
    }
    console.log(`Created ${createdOrders.length} sample orders`);

    console.log('\n=== Test Data Summary ===');
    console.log(`Supplier: ${supplier.email} / password123`);
    console.log(`Customer: ${customer.email} / password123`);
    console.log(`Products: ${createdProducts.length} items`);
    console.log(`Orders: ${createdOrders.length} orders`);
    console.log(`Stores: ${stores.length} stores associated`);
    console.log('\nSupplier dashboard ready for testing!');

  } catch (error) {
    console.error('Error seeding supplier data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seed function
if (require.main === module) {
  seedSupplierData();
}

module.exports = seedSupplierData; 