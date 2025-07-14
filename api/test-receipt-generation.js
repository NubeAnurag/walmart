const mongoose = require('mongoose');
const { generateReceiptPDF, generateReceiptImage } = require('./utils/receiptGenerator');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const testReceiptGeneration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB for receipt generation testing');

    // Sample sale data for testing
    const testSaleData = {
      transactionId: 'TEST-2025-001',
      saleDate: new Date(),
      totalAmount: 152.00,
      subtotal: 152.00,
      items: [
        {
          name: 'JBL Bluetooth Speaker',
          quantity: 2,
          unitPrice: 25.00,
          totalPrice: 50.00,
          barcode: '123456789',
          category: 'Electronics'
        },
        {
          name: 'Nike Football Boots',
          quantity: 2,
          unitPrice: 50.00,
          totalPrice: 100.00,
          barcode: '987654321',
          category: 'Sports'
        },
        {
          name: 'Cadbury Dairy Milk',
          quantity: 2,
          unitPrice: 1.00,
          totalPrice: 2.00,
          barcode: '456789123',
          category: 'Food'
        }
      ],
      customerInfo: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '1234567890'
      },
      storeInfo: {
        name: 'Walmart Supercenter - Downtown',
        storeCode: 'STR01',
        address: '123 Main Street, Downtown, NY 10001',
        phone: '+15551234567'
      },
      staffInfo: {
        name: 'Anuj Sharma',
        employeeId: 'EMP-STR01-CSH-001'
      }
    };

    console.log('🧪 Testing receipt generation with data:', {
      transactionId: testSaleData.transactionId,
      itemCount: testSaleData.items.length,
      total: testSaleData.totalAmount
    });

    // Test PDF generation
    console.log('🔄 Testing PDF generation...');
    const pdfBuffer = await generateReceiptPDF(testSaleData);
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Save PDF to file for inspection
    const pdfPath = path.join(__dirname, 'test-receipt.pdf');
    await fs.writeFile(pdfPath, pdfBuffer);
    console.log('💾 PDF saved to:', pdfPath);

    // Test JPEG generation
    console.log('🔄 Testing JPEG generation...');
    const jpegBuffer = await generateReceiptImage(testSaleData, 'jpeg');
    console.log('✅ JPEG generated successfully, size:', jpegBuffer.length, 'bytes');

    // Save JPEG to file for inspection
    const jpegPath = path.join(__dirname, 'test-receipt.jpg');
    await fs.writeFile(jpegPath, jpegBuffer);
    console.log('💾 JPEG saved to:', jpegPath);

    console.log('🎉 All receipt generation tests passed!');

  } catch (error) {
    console.error('❌ Receipt generation test failed:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  testReceiptGeneration();
}

module.exports = testReceiptGeneration; 