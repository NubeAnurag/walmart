const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function testCustomerDashboardAccess() {
  console.log('🧪 Testing Customer Dashboard Access...\n');

  try {
    // Step 1: Test customer login
    console.log('1️⃣ Testing customer login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'dashboardcustomer@example.com',
      password: 'password123',
      role: 'customer'
    });

    console.log('📥 Login response:', JSON.stringify(loginResponse.data, null, 2));

    if (loginResponse.data.success) {
      console.log('✅ Customer login successful');
      const token = loginResponse.data.token;
      const user = loginResponse.data.user;
      
      console.log('👤 User data:', JSON.stringify(user, null, 2));
      
      // Step 2: Test getting stores
      console.log('\n2️⃣ Testing get stores...');
      const storesResponse = await axios.get(`${API_BASE}/customer/stores`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📥 Stores response:', JSON.stringify(storesResponse.data, null, 2));

      if (storesResponse.data.success) {
        console.log('✅ Stores retrieved successfully');
        console.log(`📊 Found ${storesResponse.data.data.length} stores`);
        
        if (storesResponse.data.data.length > 0) {
          const firstStore = storesResponse.data.data[0];
          console.log(`🏪 First store: ${firstStore.name} (ID: ${firstStore._id})`);
          
          // Step 3: Test getting store products
          console.log('\n3️⃣ Testing get store products...');
          try {
            const productsResponse = await axios.get(`${API_BASE}/customer/stores/${firstStore._id}/products`, {
              headers: { Authorization: `Bearer ${token}` }
            });

            console.log('📥 Products response:', JSON.stringify(productsResponse.data, null, 2));

            if (productsResponse.data.success) {
              console.log('✅ Store products retrieved successfully');
              console.log(`📦 Found ${productsResponse.data.data.products.length} products`);
            } else {
              console.log('❌ Failed to get store products:', productsResponse.data.message);
            }
          } catch (productsError) {
            console.log('❌ Store products error:', productsError.response?.data?.message || productsError.message);
            console.log('❌ Full error:', productsError.response?.data);
          }
        }
      } else {
        console.log('❌ Failed to get stores:', storesResponse.data.message);
      }

      // Step 4: Test getting customer orders
      console.log('\n4️⃣ Testing get customer orders...');
      try {
        const ordersResponse = await axios.get(`${API_BASE}/customer/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('📥 Orders response:', JSON.stringify(ordersResponse.data, null, 2));

        if (ordersResponse.data.success) {
          console.log('✅ Customer orders retrieved successfully');
          console.log(`📋 Found ${ordersResponse.data.data.orders.length} orders`);
        } else {
          console.log('❌ Failed to get orders:', ordersResponse.data.message);
        }
      } catch (ordersError) {
        console.log('❌ Orders error:', ordersError.response?.data?.message || ordersError.message);
        console.log('❌ Full error:', ordersError.response?.data);
      }

    } else {
      console.log('❌ Customer login failed:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('❌ Full error response:', error.response.data);
    }
  }
}

// Run the test
testCustomerDashboardAccess(); 