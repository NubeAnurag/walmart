const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5001/api';

// Simple 1x1 pixel red PNG in base64
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHI8WB4KgAAAABJRU5ErkJggg==';

async function testProductWithImage() {
  try {
    console.log('🧪 Testing Product Creation with Base64 Image...\n');

    // Step 1: Login as our test supplier
    console.log('1. Logging in as test supplier...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test-supplier@example.com',
      password: 'testpassword123',
      role: 'supplier'
    });
    console.log('✅ Supplier logged in successfully');
    
    const token = loginResponse.data.data.token;

    // Step 2: Test adding a product with base64 image
    console.log('\n2. Creating product with base64 image...');
    const productData = {
      name: 'Test Product with Image',
      description: 'This is a test product created with a base64 encoded image to verify the new image storage system works correctly.',
      price: 9.99,
      category: 'Food & Beverages',
      brand: 'Test Brand',
      stock: 100,
      image: testImageBase64
    };

    const addProductResponse = await axios.post(`${API_BASE}/supplier/products`, productData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Product created successfully!');
    console.log('📝 Product ID:', addProductResponse.data.data.product.id);
    console.log('🖼️ Image stored as:', addProductResponse.data.data.product.image ? 'Base64 data' : 'No image');

    // Step 3: Verify the product was created correctly
    console.log('\n3. Verifying product creation...');
    const getProductsResponse = await axios.get(`${API_BASE}/supplier/products`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const products = getProductsResponse.data.data.products;
    const testProduct = products.find(p => p.name === 'Test Product with Image');
    
    if (testProduct) {
      console.log('✅ Product found in database');
      console.log('📊 Product details:');
      console.log('   - Name:', testProduct.name);
      console.log('   - Price:', testProduct.price);
      console.log('   - Stock:', testProduct.stock);
      console.log('   - Has Image:', !!testProduct.image);
      console.log('   - Image Type:', testProduct.image ? 'Base64 Data URL' : 'None');
      console.log('   - Assigned Stores:', testProduct.storeIds?.length || 0);
    } else {
      throw new Error('Test product not found in products list');
    }

    console.log('\n🎉 All tests passed! Product with base64 image works correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('📋 Validation errors:', error.response.data.errors);
    }
  }
}

// Run the test
testProductWithImage(); 