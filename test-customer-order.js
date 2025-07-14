const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function testCustomerOrder() {
  console.log('🧪 Testing Customer Order Creation...\n');

  try {
    // Step 1: Authenticate as customer
    console.log('1️⃣ Authenticating as customer...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'kartik@gmail.com',
      password: '123456',
      role: 'customer'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Authentication failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Authentication successful');

    // Step 2: Get stores
    console.log('\n2️⃣ Getting stores...');
    const storesResponse = await axios.get(`${API_BASE}/customer/stores`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!storesResponse.data.success) {
      console.log('❌ Failed to get stores:', storesResponse.data.message);
      return;
    }

    const stores = storesResponse.data.data;
    console.log(`✅ Found ${stores.length} stores`);
    
    if (stores.length === 0) {
      console.log('❌ No stores available for testing');
      return;
    }

    const selectedStore = stores[0];
    console.log(`📦 Selected store: ${selectedStore.name} (ID: ${selectedStore.id})`);

    // Step 3: Get products for the store
    console.log('\n3️⃣ Getting products for store...');
    const productsResponse = await axios.get(`${API_BASE}/customer/stores/${selectedStore.id}/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!productsResponse.data.success) {
      console.log('❌ Failed to get products:', productsResponse.data.message);
      return;
    }

    const products = productsResponse.data.data.products;
    console.log(`✅ Found ${products.length} products in store`);

    if (products.length === 0) {
      console.log('❌ No products available for testing');
      return;
    }

    // Step 4: Create a test order
    console.log('\n4️⃣ Creating test order...');
    const orderData = {
      storeId: selectedStore.id,
      items: [
        {
          productId: products[0].id,
          quantity: 2
        }
      ],
      customerInfo: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890'
      },
      paymentMethod: 'cash'
    };

    console.log('📋 Order data:', JSON.stringify(orderData, null, 2));

    const orderResponse = await axios.post(`${API_BASE}/customer/orders`, orderData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (orderResponse.data.success) {
      console.log('✅ Order created successfully!');
      console.log('📊 Order details:', JSON.stringify(orderResponse.data.data, null, 2));
      
      const saleId = orderResponse.data.data.sale.id;
      const transactionId = orderResponse.data.data.transactionId;
      
      console.log(`🆔 Sale ID: ${saleId}`);
      console.log(`🆔 Transaction ID: ${transactionId}`);
      console.log(`💰 Total Amount: $${orderResponse.data.data.totalAmount}`);
      console.log(`📄 Receipt URL: ${orderResponse.data.data.receiptDownloadUrl}`);

      // Step 5: Test receipt download
      console.log('\n5️⃣ Testing receipt download...');
      try {
        const receiptResponse = await axios.get(`${API_BASE}/customer/receipt/${saleId}?format=pdf`, {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'arraybuffer'
        });

        console.log('✅ Receipt downloaded successfully!');
        console.log(`📄 Receipt size: ${receiptResponse.data.length} bytes`);
        console.log(`📄 Content-Type: ${receiptResponse.headers['content-type']}`);
        
        // Save receipt to file for testing
        const fs = require('fs');
        fs.writeFileSync(`test-receipt-${transactionId}.pdf`, receiptResponse.data);
        console.log(`💾 Receipt saved as: test-receipt-${transactionId}.pdf`);

      } catch (receiptError) {
        console.log('❌ Receipt download failed:', receiptError.response?.data?.message || receiptError.message);
      }

    } else {
      console.log('❌ Order creation failed:', orderResponse.data.message);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

testCustomerOrder(); 